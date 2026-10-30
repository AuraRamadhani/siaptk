import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';

        // 1. REGISTRASI KELUARGA / TAMBAH ANAK (Multipart Form / Upload File)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const action = formData.get('action');

            // --- REGISTRASI KELUARGA ---
            if (action === 'register_keluarga') {
                const namaAyah = formData.get('namaAyah') as string;
                const namaIbu = formData.get('namaIbu') as string;
                const pekerjaanAyah = formData.get('pekerjaanAyah') as string;
                const pekerjaanIbu = formData.get('pekerjaanIbu') as string;
                const noHp = formData.get('noHp') as string;
                const email = (formData.get('email') as string)?.toLowerCase().trim();

                const fileKK = formData.get('fileKK') as File | null;
                const fileKTP = formData.get('fileKTP') as File | null;

                const existingUser = await prisma.keluarga.findUnique({
                    where: { email },
                });

                if (existingUser) {
                    return NextResponse.json(
                        { success: false, error: 'Email tersebut sudah terdaftar di database.' },
                        { status: 409 }
                    );
                }

                let kkFilename = null;
                let ktpFilename = null;

                const uploadDir = path.join(process.cwd(), 'public/uploads');
                mkdirSync(uploadDir, { recursive: true });

                if (fileKK && fileKK.size > 0) {
                    const bytes = await fileKK.arrayBuffer();
                    const buffer = Buffer.from(bytes);
                    kkFilename = `kk_${Date.now()}_${fileKK.name}`;
                    await writeFile(path.join(uploadDir, kkFilename), buffer);
                }

                if (fileKTP && fileKTP.size > 0) {
                    const bytes = await fileKTP.arrayBuffer();
                    const buffer = Buffer.from(bytes);
                    ktpFilename = `ktp_${Date.now()}_${fileKTP.name}`;
                    await writeFile(path.join(uploadDir, ktpFilename), buffer);
                }

                const newKeluarga = await prisma.keluarga.create({
                    data: {
                        namaAyah,
                        namaIbu,
                        noHp,
                        email,
                        alamat: `Pekerjaan Ayah: ${pekerjaanAyah || '-'}, Pekerjaan Ibu: ${pekerjaanIbu || '-'}`,
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
                const email = (formData.get('email') as string)?.toLowerCase().trim();
                const namaAnak = formData.get('namaAnak') as string;
                const nikAnak = formData.get('nikAnak') as string;
                const tglLahirAnak = formData.get('tglLahirAnak') as string;

                const fileAkta = formData.get('fileAkta') as File | null;
                const fileFoto = formData.get('fileFoto') as File | null;
                const fileKia = formData.get('fileKia') as File | null;

                const keluarga = await prisma.keluarga.findUnique({
                    where: { email },
                });

                if (!keluarga) {
                    return NextResponse.json(
                        { success: false, error: 'Sesi keluarga tidak ditemukan.' },
                        { status: 404 }
                    );
                }

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

                // Simpan data anak ke database
                const newAnak = await prisma.anak.create({
                    data: {
                        idKeluarga: keluarga.idKeluarga,
                        nama: namaAnak,
                        nik: nikAnak,
                        tglLahir: new Date(tglLahirAnak || '2021-05-10'),
                        status: 'PENDAFTAR',
                    },
                });

                return NextResponse.json({ success: true, data: newAnak, message: 'Anak baru berhasil didaftarkan dengan berkas!' });
            }
        }

        // 2. LOGIN (JSON Request)
        const body = await request.json();
        const { action, email } = body;

        if (action === 'login') {
            const keluarga = await prisma.keluarga.findUnique({
                where: { email: email?.toLowerCase().trim() },
                include: { anak: true, berkasKeluarga: true },
            });

            if (!keluarga) {
                return NextResponse.json(
                    { success: false, error: 'Akun dengan email tersebut tidak ditemukan.' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: keluarga });
        }

        return NextResponse.json({ success: false, error: 'Aksi API tidak valid.' }, { status: 400 });
    } catch (error: any) {
        console.error("API Error Detail:", error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Email atau data unik tersebut sudah terdaftar di sistem.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan pada server database.' },
            { status: 500 }
        );
    }
}