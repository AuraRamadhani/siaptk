import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';
import { sesiSekarang } from '@/lib/sesi';
import { hashSandi } from '@/lib/sandi';
import { otomatisKelompokAnak } from '@/lib/kelompok';
import { buatTagihanPendaftaran } from '@/lib/tagihan';

const TIPE_BERKAS = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAKS_BERKAS = 5 * 1024 * 1024;

function berkasSah(f: File): string | null {
  if (f.size === 0) return null;
  if (f.size > MAKS_BERKAS) return `Berkas ${f.name} melebihi 5 MB.`;
  if (!TIPE_BERKAS.has(f.type)) return `Tipe berkas ${f.type || 'tidak dikenal'} tidak diizinkan (PDF/JPG/PNG).`;
  return null;
}

function namaAman(nama: string): string {
  return nama.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';

        // 1. REGISTRASI KELUARGA / TAMBAH ANAK (Multipart Form / Upload File)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const action = formData.get('action');

            // --- REGISTRASI KELUARGA (publik) ---
            if (action === 'register_keluarga') {
                const namaAyah = formData.get('namaAyah') as string;
                const namaIbu = formData.get('namaIbu') as string;
                const pekerjaanAyah = formData.get('pekerjaanAyah') as string;
                const pekerjaanIbu = formData.get('pekerjaanIbu') as string;
                const noHp = formData.get('noHp') as string;
                const email = (formData.get('email') as string)?.toLowerCase().trim();
                const kataSandi = (formData.get('password') as string) || '';

                const fileKK = formData.get('fileKK') as File | null;
                const fileKTP = formData.get('fileKTP') as File | null;

                if (!email || !noHp || kataSandi.length < 6) {
                    return NextResponse.json(
                        { success: false, error: 'Email, nomor HP, dan kata sandi (min. 6 karakter) wajib diisi.' },
                        { status: 400 }
                    );
                }

                if (!(fileKK instanceof File) || fileKK.size === 0 || !(fileKTP instanceof File) || fileKTP.size === 0) {
                    return NextResponse.json(
                        { success: false, error: 'Berkas Kartu Keluarga (KK) dan KTP Orang Tua wajib diunggah.' },
                        { status: 400 }
                    );
                }

                for (const f of [fileKK, fileKTP]) {
                    const salah = berkasSah(f);
                    if (salah) return NextResponse.json({ success: false, error: salah }, { status: 400 });
                }

                const existingUser = await prisma.keluarga.findUnique({
                    where: { email },
                });

                if (existingUser) {
                    return NextResponse.json(
                        { success: false, error: 'Email tersebut sudah terdaftar di database.' },
                        { status: 409 }
                    );
                }

                const uploadDir = path.join(process.cwd(), 'public/uploads');
                mkdirSync(uploadDir, { recursive: true });

                const simpan = async (f: File | null, awalan: string) => {
                    if (!f || f.size === 0) return null;
                    const nama = `${awalan}_${Date.now()}_${namaAman(f.name)}`;
                    await writeFile(path.join(uploadDir, nama), Buffer.from(await f.arrayBuffer()));
                    return nama;
                };

                const kkFilename = await simpan(fileKK, 'kk');
                const ktpFilename = await simpan(fileKTP, 'ktp');

                const newKeluarga = await prisma.keluarga.create({
                    data: {
                        namaAyah,
                        namaIbu,
                        noHp,
                        email,
                        kataSandi: hashSandi(kataSandi),
                        alamat: `Pekerjaan Ayah: ${pekerjaanAyah || '-'}, Pekerjaan Ibu: ${pekerjaanIbu || '-'}`,
                        fileKK: kkFilename,
                        fileKTP: ktpFilename,
                        berkasKeluarga: {
                            create: [
                                ...(kkFilename ? [{ jenis: 'KK' as const, file: kkFilename }] : []),
                                ...(ktpFilename ? [{ jenis: 'KTP_ORTU' as const, file: ktpFilename }] : []),
                            ],
                        },
                    },
                    include: {
                        berkasKeluarga: true,
                    },
                });

                return NextResponse.json({ success: true, data: newKeluarga, message: 'Registrasi keluarga berhasil!' });
            }

            // --- TAMBAH ANAK BARU DENGAN UPLOAD BERKAS (AKTA, FOTO, KIA) ---
            if (action === 'add_child') {
                const sesi = await sesiSekarang();
                if (!sesi) {
                    return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
                }

                const namaAnak = formData.get('namaAnak') as string;
                const nikAnak = formData.get('nikAnak') as string;
                const tglLahirAnak = formData.get('tglLahirAnak') as string;

                const fileAkta = formData.get('fileAkta') as File | null;
                const fileFoto = formData.get('fileFoto') as File | null;
                const fileKia = formData.get('fileKia') as File | null;

                // NIK wajib tepat 16 digit angka
                if (!/^\d{16}$/.test(nikAnak || '')) {
                    return NextResponse.json(
                        { success: false, error: 'NIK harus terdiri dari tepat 16 digit angka.' },
                        { status: 400 }
                    );
                }

                // Ketiga berkas anak wajib diunggah
                if (
                    !(fileAkta instanceof File) || fileAkta.size === 0 ||
                    !(fileFoto instanceof File) || fileFoto.size === 0 ||
                    !(fileKia instanceof File) || fileKia.size === 0
                ) {
                    return NextResponse.json(
                        { success: false, error: 'Ketiga berkas wajib diunggah: Akta Kelahiran, Pas Foto, dan KIA.' },
                        { status: 400 }
                    );
                }

                for (const f of [fileAkta, fileFoto, fileKia]) {
                    const salah = berkasSah(f);
                    if (salah) return NextResponse.json({ success: false, error: salah }, { status: 400 });
                }

                // Anak selalu masuk ke keluarga pemilik sesi.
                const keluarga = await prisma.keluarga.findUnique({
                    where: { idKeluarga: sesi.id },
                });

                if (!keluarga) {
                    return NextResponse.json(
                        { success: false, error: 'Sesi keluarga tidak ditemukan.' },
                        { status: 404 }
                    );
                }

                const uploadDir = path.join(process.cwd(), 'public/uploads');
                mkdirSync(uploadDir, { recursive: true });

                const simpan = async (f: File, awalan: string) => {
                    const nama = `${awalan}_${Date.now()}_${namaAman(f.name)}`;
                    await writeFile(path.join(uploadDir, nama), Buffer.from(await f.arrayBuffer()));
                    return nama;
                };

                const aktaFilename = await simpan(fileAkta, 'akta');
                const fotoFilename = await simpan(fileFoto, 'foto');
                const kiaFilename = await simpan(fileKia, 'kia');

                // Simpan data anak ke database
                const jenisKelamin = (formData.get('jenisKelamin') as string) || 'Laki-laki';
                const jalurPendaftaran = (formData.get('jalurPendaftaran') as string) || 'Daring';

                const newAnak = await prisma.anak.create({
                    data: {
                        idKeluarga: keluarga.idKeluarga,
                        nama: namaAnak,
                        nik: nikAnak,
                        tglLahir: new Date(tglLahirAnak || '2021-05-10'),
                        jenisKelamin: jenisKelamin.slice(0, 1).toUpperCase() === 'P' ? 'P' : 'L',
                        jalurPendaftaran,
                        status: 'PENDAFTAR',
                    },
                });

                // Satu baris berkas per anak.
                await prisma.berkasAnak.create({
                    data: { idAnak: newAnak.idAnak, akta: aktaFilename, foto: fotoFilename, kia: kiaFilename },
                });

                await otomatisKelompokAnak(prisma, newAnak.idAnak, newAnak.tglLahir);
                await buatTagihanPendaftaran(prisma, newAnak.idAnak);

                return NextResponse.json({ success: true, data: newAnak, message: 'Anak baru berhasil didaftarkan dengan berkas!' });
            }

            return NextResponse.json({ success: false, error: 'Aksi API tidak valid.' }, { status: 400 });
        }

        // 2. LOGIN (JSON Request)
        const body = await request.json();
        const { action } = body;

        // --- TAMBAH ANAK BARU TANPA UPLOAD BERKAS (JSON) ---
        if (action === 'add_child') {
            const sesi = await sesiSekarang();
            if (!sesi) {
                return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
            }

            const keluarga = await prisma.keluarga.findUnique({
                where: { idKeluarga: sesi.id },
            });

            if (!keluarga) {
                return NextResponse.json(
                    { success: false, error: 'Sesi keluarga tidak ditemukan.' },
                    { status: 404 }
                );
            }

            const nik = body.nikAnak || `3171${Date.now()}`;
            if (!/^\d{16}$/.test(nik)) {
                return NextResponse.json(
                    { success: false, error: 'NIK harus terdiri dari tepat 16 digit angka.' },
                    { status: 400 }
                );
            }

            const newAnak = await prisma.anak.create({
                data: {
                    idKeluarga: keluarga.idKeluarga,
                    nama: body.namaAnak,
                    nik,
                    tglLahir: new Date(body.tglLahirAnak || '2021-05-10'),
                    status: 'PENDAFTAR',
                    jenisKelamin: String(body.jenisKelamin || 'L').slice(0, 1).toUpperCase() === 'P' ? 'P' : 'L',
                    jalurPendaftaran: body.jalurPendaftaran || 'Daring',
                },
            });

            return NextResponse.json({ success: true, data: newAnak, message: 'Calon siswa baru berhasil didaftarkan.' });
        }

        // Login berbasis email tanpa kata sandi dihapus: membocorkan seluruh data
        // keluarga ke siapa pun yang tahu emailnya. Gunakan /api/auth/masuk.
        return NextResponse.json(
            { success: false, error: 'Aksi API tidak valid. Gunakan /api/auth/masuk untuk login.' },
            { status: 400 }
        );
    } catch (error: unknown) {
        console.error('API Error Detail:', error);

        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Email atau data unik tersebut sudah terdaftar di sistem.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan pada server database.' },
            { status: 500 }
        );
    }
}