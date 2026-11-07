import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';

// GET: Mengambil data keluarga, anak, riwayat kelompok, dan tagihan
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Parameter email diperlukan.' },
                { status: 400 }
            );
        }

        const keluarga = await prisma.keluarga.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: {
                anak: {
                    include: {
                        riwayatKelompok: {
                            include: { kelompok: true }
                        },
                        tagihan: true, // Menarik data tagihan masing-masing anak
                        rekeningTabungan: {
                            include: {
                                transaksi: {
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        }
                    }
                },
                berkasKeluarga: true
            },
        });

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