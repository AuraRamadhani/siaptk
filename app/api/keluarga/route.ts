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

        let keluarga;
        if (email) {
            // Staf boleh mencari keluarga mana pun; orang tua hanya dirinya sendiri.
            const staf = sesi.peran === 'BENDAHARA' || sesi.peran === 'KEPALA_SEKOLAH' || sesi.peran === 'GURU';
            keluarga = await prisma.keluarga.findUnique({
                where: { email: email.toLowerCase().trim() },
                include: {
                    anak: {
                        include: {
                            riwayatKelompok: { include: { kelompok: true } },
                            tagihan: true,
                            rekeningTabungan: { include: { transaksi: { orderBy: { createdAt: 'desc' } } } },
                        },
                    },
                    berkasKeluarga: true,
                },
            });
            if (keluarga && !staf && keluarga.idKeluarga !== sesi.id) {
                return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
            }
        } else {
            keluarga = await prisma.keluarga.findUnique({
                where: { idKeluarga: sesi.id },
                include: {
                    anak: {
                        include: {
                            riwayatKelompok: { include: { kelompok: true } },
                            tagihan: true,
                            rekeningTabungan: { include: { transaksi: { orderBy: { createdAt: 'desc' } } } },
                        },
                    },
                    berkasKeluarga: true,
                },
            });
        }

        if (!keluarga) {
            return NextResponse.json(
                { success: false, error: 'Data keluarga tidak ditemukan.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: keluarga });
    } catch (error: any) {
        console.error("API Keluarga GET Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan pada server.' },
            { status: 500 }
        );
    }
}

// POST: Menangani penambahan anak baru & unggah berkas anak (Akta, Foto, KIA)
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const action = formData.get('action');

        if (action === 'add_child') {
            const email = (formData.get('email') as string)?.toLowerCase().trim();
            const namaAnak = formData.get('namaAnak') as string;
            const nikAnak = formData.get('nikAnak') as string;
            const tglLahirAnak = formData.get('tglLahirAnak') as string;

            const fileAkta = formData.get('fileAkta') as File | null;
            const fileFoto = formData.get('fileFoto') as File | null;
            const fileKia = formData.get('fileKia') as File | null;

            if (!email || !namaAnak || !nikAnak || !tglLahirAnak) {
                return NextResponse.json(
                    { success: false, error: 'Data utama anak tidak lengkap.' },
                    { status: 400 }
                );
            }

            const keluarga = await prisma.keluarga.findUnique({
                where: { email },
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

            let aktaFilename = null;
            let fotoFilename = null;
            let kiaFilename = null;

            if (fileAkta && fileAkta.size > 0) {
                const bytes = await fileAkta.arrayBuffer();
                aktaFilename = `akta_${Date.now()}_${fileAkta.name}`;
                await writeFile(path.join(uploadDir, aktaFilename), Buffer.from(bytes));
            }

            if (fileFoto && fileFoto.size > 0) {
                const bytes = await fileFoto.arrayBuffer();
                fotoFilename = `foto_${Date.now()}_${fileFoto.name}`;
                await writeFile(path.join(uploadDir, fotoFilename), Buffer.from(bytes));
            }

            if (fileKia && fileKia.size > 0) {
                const bytes = await fileKia.arrayBuffer();
                kiaFilename = `kia_${Date.now()}_${fileKia.name}`;
                await writeFile(path.join(uploadDir, kiaFilename), Buffer.from(bytes));
            }

            // Simpan data anak baru ke database MySQL menggunakan Prisma
            const newAnak = await prisma.anak.create({
                data: {
                    idKeluarga: keluarga.idKeluarga,
                    nama: namaAnak,
                    nik: nikAnak,
                    tglLahir: new Date(tglLahirAnak),
                    status: 'PENDAFTAR',
                    jenisKelamin: 'L',
                    jalurPendaftaran: 'Onsite',
                },
            });

            // Jika file berkas diunggah, simpan juga ke tabel berkas_anak
            const berkasDataToCreate = [];
            if (aktaFilename) berkasDataToCreate.push({ idAnak: newAnak.idAnak, jenis: 'AKTA' as const, file: aktaFilename });
            if (fotoFilename) berkasDataToCreate.push({ idAnak: newAnak.idAnak, jenis: 'PAS_FOTO' as const, file: fotoFilename });
            if (kiaFilename) berkasDataToCreate.push({ idAnak: newAnak.idAnak, jenis: 'KIA' as const, file: kiaFilename });

            if (berkasDataToCreate.length > 0) {
                await prisma.berkasAnak.createMany({
                    data: berkasDataToCreate,
                });
            }

            return NextResponse.json({
                success: true,
                data: newAnak,
                message: 'Anak baru berhasil didaftarkan dan berkas disimpan!'
            });
        }

        return NextResponse.json({ success: false, error: 'Aksi API tidak valid.' }, { status: 400 });
    } catch (error: any) {
        console.error("API Keluarga POST Error:", error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'NIK anak tersebut sudah terdaftar di sistem.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan pada server database.' },
            { status: 500 }
        );
    }
}