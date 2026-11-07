import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';
import { sesiSekarang } from '@/lib/sesi';

/** Validasi berkas unggahan: hanya PDF/JPG/PNG, maksimum 5 MB. */
const TIPE_BERKAS = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAKS_BERKAS = 5 * 1024 * 1024;

function berkasSah(f: File): string | null {
  if (f.size === 0) return null;
  if (f.size > MAKS_BERKAS) return `Berkas ${f.name} melebihi 5 MB.`;
  if (!TIPE_BERKAS.has(f.type)) return `Tipe berkas ${f.type || 'tidak dikenal'} tidak diizinkan (PDF/JPG/PNG).`;
  return null;
}

/** Nama berkas aman: hanya huruf, angka, titik, garis bawah. */
function namaAman(nama: string): string {
  return nama.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}


// GET: Mengambil data keluarga, anak, riwayat kelompok, dan tagihan
// Tanpa ?email -> keluarga milik sesi sendiri (portal orang tua).
export async function GET(request: Request) {
    try {
        const sesi = await sesiSekarang();
        if (!sesi) {
            return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        const sertakan = {
            anak: {
                include: {
                    riwayatKelompok: { include: { kelompok: true } },
                    tagihan: true,
                    rekeningTabungan: { include: { transaksi: { orderBy: { createdAt: 'desc' as const } } } },
                },
            },
            berkasKeluarga: true,
        };

        let keluarga;
        if (email) {
            // Staf boleh mencari keluarga mana pun; orang tua hanya dirinya sendiri.
            const staf = sesi.peran === 'BENDAHARA' || sesi.peran === 'KEPALA_SEKOLAH' || sesi.peran === 'GURU';
            keluarga = await prisma.keluarga.findUnique({
                where: { email: email.toLowerCase().trim() },
                omit: { kataSandi: true },
                include: sertakan,
            });
            if (keluarga && !staf && keluarga.idKeluarga !== sesi.id) {
                return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
            }
        } else {
            keluarga = await prisma.keluarga.findUnique({
                where: { idKeluarga: sesi.id },
                omit: { kataSandi: true },
                include: sertakan,
            });
        }

        if (!keluarga) {
            return NextResponse.json(
                { success: false, error: 'Data keluarga tidak ditemukan.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: keluarga });
    } catch (error) {
        console.error("API Keluarga GET Error:", error);
        return NextResponse.json(
            { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}

// POST: Menangani penambahan anak baru & unggah berkas anak (Akta, Foto, KIA)
export async function POST(request: Request) {
    try {
        const sesi = await sesiSekarang();
        if (!sesi) {
            return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
        }

        const formData = await request.formData();
        const action = formData.get('action');

        if (action === 'add_child') {
            const namaAnak = formData.get('namaAnak') as string;
            const nikAnak = formData.get('nikAnak') as string;
            const tglLahirAnak = formData.get('tglLahirAnak') as string;

            const fileAkta = formData.get('fileAkta') as File | null;
            const fileFoto = formData.get('fileFoto') as File | null;
            const fileKia = formData.get('fileKia') as File | null;

            if (!namaAnak || !nikAnak || !tglLahirAnak) {
                return NextResponse.json(
                    { success: false, error: 'Data utama anak tidak lengkap.' },
                    { status: 400 }
                );
            }

            if (!/^\d{16}$/.test(nikAnak)) {
                return NextResponse.json(
                    { success: false, error: 'NIK harus terdiri dari tepat 16 digit angka.' },
                    { status: 400 }
                );
            }

            for (const f of [fileAkta, fileFoto, fileKia]) {
                if (f && f.size > 0) {
                    const salah = berkasSah(f);
                    if (salah) return NextResponse.json({ success: false, error: salah }, { status: 400 });
                }
            }

            // Anak selalu ditambahkan ke keluarga pemilik sesi; email di form diabaikan.
            const keluarga = await prisma.keluarga.findUnique({
                where: { idKeluarga: sesi.id },
            });

            if (!keluarga) {
                return NextResponse.json(
                    { success: false, error: 'Sesi keluarga tidak ditemukan.' },
                    { status: 404 }
                );
            }

            // Pastikan folder public/uploads tersedia
            const uploadDir = path.join(process.cwd(), 'public/uploads');
            mkdirSync(uploadDir, { recursive: true });

            const simpan = async (f: File | null, awalan: string) => {
                if (!f || f.size === 0) return null;
                const nama = `${awalan}_${Date.now()}_${namaAman(f.name)}`;
                await writeFile(path.join(uploadDir, nama), Buffer.from(await f.arrayBuffer()));
                return nama;
            };

            const aktaFilename = await simpan(fileAkta, 'akta');
            const fotoFilename = await simpan(fileFoto, 'foto');
            const kiaFilename = await simpan(fileKia, 'kia');

            // Simpan data anak baru ke database MySQL menggunakan Prisma
            const newAnak = await prisma.anak.create({
                data: {
                    idKeluarga: keluarga.idKeluarga,
                    nama: namaAnak,
                    nik: nikAnak,
                    tglLahir: new Date(tglLahirAnak),
                    status: 'PENDAFTAR',
                    jenisKelamin: ((formData.get('jenisKelamin') as string) || 'L').slice(0, 1).toUpperCase() === 'P' ? 'P' : 'L',
                    jalurPendaftaran: (formData.get('jalurPendaftaran') as string) || 'Daring',
                },
            });

            // Satu baris berkas per anak (akta/foto/kia sebagai kolom terpisah).
            if (aktaFilename || fotoFilename || kiaFilename) {
                await prisma.berkasAnak.create({
                    data: {
                        idAnak: newAnak.idAnak,
                        akta: aktaFilename,
                        foto: fotoFilename,
                        kia: kiaFilename,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                data: newAnak,
                message: 'Anak baru berhasil didaftarkan dan berkas disimpan!'
            });
        }

        return NextResponse.json({ success: false, error: 'Aksi API tidak valid.' }, { status: 400 });
    } catch (error) {
        console.error("API Keluarga POST Error:", error);

        if ((error as { code?: string }).code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'NIK anak tersebut sudah terdaftar di sistem.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server database.' },
            { status: 500 }
        );
    }
}

// PATCH /api/keluarga -> perbarui data kontak keluarga (orang tua sendiri / staf)
export async function PATCH(request: Request) {
    try {
        const sesi = await sesiSekarang();
        if (!sesi) {
            return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
        }

        const { idKeluarga, namaAyah, namaIbu, noHp, alamat } = await request.json();
        const target = sesi.peran === 'ORANG_TUA' ? sesi.id : idKeluarga;
        if (!target) {
            return NextResponse.json({ success: false, error: 'idKeluarga wajib diisi.' }, { status: 400 });
        }
        if (sesi.peran === 'ORANG_TUA' && idKeluarga && idKeluarga !== sesi.id) {
            return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
        }

        const ada = await prisma.keluarga.findUnique({ where: { idKeluarga: target } });
        if (!ada) {
            return NextResponse.json({ success: false, error: 'Keluarga tidak ditemukan.' }, { status: 404 });
        }

        const updated = await prisma.keluarga.update({
            where: { idKeluarga: target },
            data: {
                namaAyah: namaAyah !== undefined ? (namaAyah || null) : undefined,
                namaIbu: namaIbu !== undefined ? (namaIbu || null) : undefined,
                noHp: noHp ? String(noHp).trim() : undefined,
                alamat: alamat !== undefined ? (alamat || null) : undefined,
            },
            // Jangan pernah kirim hash kata sandi ke klien.
            select: { idKeluarga: true, namaAyah: true, namaIbu: true, noHp: true, email: true, alamat: true },
        });

        return NextResponse.json({ success: true, data: updated, message: 'Data keluarga diperbarui.' });
    } catch (error) {
        console.error('API Keluarga PATCH Error:', error);
        return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
    }
}