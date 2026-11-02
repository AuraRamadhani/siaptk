import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs, { mkdirSync } from 'fs';

/**
 * GET /api/keluarga?email=...
 * Mengambil data keluarga berdasarkan email orang tua beserta relasi yang lengkap.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Parameter email wajib diisi' },
                { status: 400 }
            );
        }

        const cleanEmail = email.toLowerCase().trim();

        const keluarga = await prisma.keluarga.findUnique({
            where: { email: cleanEmail },
            include: {
                anak: {
                    include: {
                        berkasAnak: true,
                        riwayatKelompok: {
                            include: {
                                kelompok: true,
                            },
                        },
                        tagihan: {
                            include: {
                                pembayaran: true,
                            },
                        },
                        rekeningTabungan: {
                            include: {
                                transaksi: true,
                            },
                        },
                        laporanMingguan: {
                            include: {
                                tema: true,
                            },
                        },
                    },
                },
                berkasKeluarga: true,
            },
        });

        if (!keluarga) {
            return NextResponse.json(
                { success: false, error: 'Data keluarga tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: keluarga });
    } catch (error: any) {
        console.error('Error fetching keluarga:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/keluarga
 * Menangani berbagai action via FormData:
 * - 'add_child': Pendaftaran anak baru & berkas
 * - 'bayar_tagihan': Pembayaran tagihan
 * - 'book_kunjungan': Booking kunjungan onsite
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const action = formData.get('action') as string;

        // Routing berdasarkan action
        switch (action) {
            case 'add_child': {
                // --- ACTION: add_child - Pendaftaran Anak Baru & Berkas ---
                console.log('--- DEBUG POST /api/keluarga action=add_child ---');
                console.log('email dari form:', formData.get('email'));

                const emailRaw = formData.get('email') as string;
                const email = emailRaw ? emailRaw.toLowerCase().trim() : '';
                const namaAnak = formData.get('namaAnak') as string;
                const nikAnak = formData.get('nikAnak') as string;
                const tglLahirAnak = formData.get('tglLahirAnak') as string;
                const jenisKelamin = formData.get('jenisKelamin') as string;
                const jalurPendaftaran = formData.get('jalurPendaftaran') as string; // 'Daring' | 'Onsite'

                // Validasi field wajib
                if (
                    !email ||
                    !namaAnak ||
                    !nikAnak ||
                    !tglLahirAnak ||
                    !jenisKelamin ||
                    !jalurPendaftaran
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: `Field wajib tidak lengkap.`
                        },
                        { status: 400 }
                    );
                }

                // NIK wajib tepat 16 digit angka
                if (!/^\d{16}$/.test(nikAnak)) {
                    return NextResponse.json(
                        { success: false, error: 'NIK harus terdiri dari tepat 16 digit angka.' },
                        { status: 400 }
                    );
                }

                // Ketiga berkas anak wajib diunggah
                const cekBerkas = (namaField: string) => {
                    const f = formData.get(namaField);
                    return f instanceof File && f.size > 0;
                };
                if (!cekBerkas('fileAkta') || !cekBerkas('fileFoto') || !cekBerkas('fileKia')) {
                    return NextResponse.json(
                        { success: false, error: 'Ketiga berkas wajib diunggah: Akta Kelahiran, Pas Foto, dan KIA.' },
                        { status: 400 }
                    );
                }

                // 1. Cari keluarga berdasarkan email yang bersih
                const keluarga = await prisma.keluarga.findUnique({
                    where: { email },
                });

                if (!keluarga) {
                    console.error(`Pencarian gagal: Keluarga dengan email "${email}" tidak ditemukan di database.`);
                    return NextResponse.json(
                        { success: false, error: `Sesi keluarga tidak ditemukan untuk email: ${email}` },
                        { status: 404 }
                    );
                }

                // 2. Simpan data anak baru ke database menggunakan Prisma Client
                let newAnak;
                try {
                    newAnak = await prisma.anak.create({
                        data: {
                            idKeluarga: keluarga.idKeluarga,
                            nama: namaAnak,
                            nik: nikAnak,
                            tglLahir: new Date(tglLahirAnak),
                            jenisKelamin: jenisKelamin,
                            jalurPendaftaran: jalurPendaftaran,
                            status: 'PENDAFTAR',
                        },
                    });
                } catch (error: any) {
                    // Handle duplikasi NIK (Prisma unique constraint error P2002)
                    if (error.code === 'P2002') {
                        return NextResponse.json(
                            { success: false, error: 'NIK anak tersebut sudah terdaftar di sistem.' },
                            { status: 409 }
                        );
                    }
                    throw error;
                }

                // 3. Jika jalur pendaftaran 'Daring', otomatis buat tagihan awal pendaftaran
                if (jalurPendaftaran === 'Daring') {
                    await prisma.tagihan.create({
                        data: {
                            idAnak: newAnak.idAnak,
                            jenis: 'PENDAFTARAN',
                            nominal: 100000,
                            status: 'BELUM_BAYAR',
                        },
                    });
                }

                // 4. Tangani unggahan berkas (Akta, Foto, KIA)
                const uploadDir = path.join(process.cwd(), 'public/uploads/calon-siswa');
                if (!fs.existsSync(uploadDir)) {
                    mkdirSync(uploadDir, { recursive: true });
                }

                // Fungsi bantu untuk menyimpan file ke disk
                const saveFile = async (file: File | null): Promise<string | null> => {
                    if (!file || typeof file === 'string' || file.size === 0) return null;
                    const bytes = await file.arrayBuffer();
                    const ext = file.name.split('.').pop() || 'jpg';
                    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                    const filepath = path.join(uploadDir, filename);
                    await writeFile(filepath, Buffer.from(bytes));
                    return filename;
                };

                const aktaFilename = await saveFile(formData.get('fileAkta') as File | null);
                const fotoFilename = await saveFile(formData.get('fileFoto') as File | null);
                const kiaFilename = await saveFile(formData.get('fileKia') as File | null);

                // 5. Simpan metadata berkas ke tabel BerkasAnak (satu baris per anak)
                if (aktaFilename || fotoFilename || kiaFilename) {
                    await prisma.berkasAnak.upsert({
                        where: { idAnak: newAnak.idAnak },
                        update: {
                            ...(aktaFilename && { akta: aktaFilename }),
                            ...(fotoFilename && { foto: fotoFilename }),
                            ...(kiaFilename && { kia: kiaFilename }),
                        },
                        create: {
                            idAnak: newAnak.idAnak,
                            akta: aktaFilename,
                            foto: fotoFilename,
                            kia: kiaFilename,
                        },
                    });
                }

                // 6. Field booking onsite opsional (dari form)
                const tanggalKedatangan = formData.get('tanggalKedatangan') as string | null;
                const jamKedatangan = formData.get('jamKedatangan') as string | null;

                return NextResponse.json({
                    success: true,
                    data: {
                        anak: newAnak,
                        aktaFilename,
                        fotoFilename,
                        kiaFilename,
                        jalurPendaftaran,
                        tanggalKedatangan,
                        jamKedatangan,
                        message: 'Anak berhasil didaftarkan dan berkas disimpan.',
                    },
                });
            }

            case 'bayar_tagihan': {
                // --- ACTION: bayar_tagihan - Pembayaran & Tagihan ---
                const idTagihan = formData.get('idTagihan') as string;
                const buktiTransfer = formData.get('buktiTransfer') as File | null;

                if (!idTagihan) {
                    return NextResponse.json(
                        { success: false, error: 'ID tagihan wajib diisi' },
                        { status: 400 }
                    );
                }

                // Validasi bahwa tagihan ada
                const tagihanExist = await prisma.tagihan.findUnique({
                    where: { idTagihan },
                });

                if (!tagihanExist) {
                    return NextResponse.json(
                        { success: false, error: 'Data tagihan tidak ditemukan' },
                        { status: 404 }
                    );
                }

                // Simpan file bukti transfer jika ada
                let buktiFilename = null;
                if (buktiTransfer && buktiTransfer.size > 0) {
                    const uploadDir = path.join(process.cwd(), 'public/uploads/pembayaran');
                    if (!fs.existsSync(uploadDir)) {
                        mkdirSync(uploadDir, { recursive: true });
                    }

                    const bytes = await buktiTransfer.arrayBuffer();
                    const ext = buktiTransfer.name.split('.').pop() || 'pdf';
                    const filename = `bukti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                    const filepath = path.join(uploadDir, filename);
                    await writeFile(filepath, Buffer.from(bytes));
                    buktiFilename = filename;
                }

                // Update status tagihan menjadi MENUNGGU_VERIFIKASI
                const updatedTagihan = await prisma.tagihan.update({
                    where: { idTagihan },
                    data: {
                        status: 'MENUNGGU_VERIFIKASI',
                        ...(buktiFilename && { buktiTransfer: buktiFilename }),
                    },
                });

                // Catat data ke tabel Pembayaran
                await prisma.pembayaran.create({
                    data: {
                        idTagihan: idTagihan,
                        metode: 'TRANSFER' as const,
                        buktiTransfer: buktiFilename,
                        diverifikasiOleh: 'ORANG_TUA',
                    },
                });

                return NextResponse.json({
                    success: true,
                    data: {
                        tagihan: updatedTagihan,
                        message: 'Pembayaran berhasil tercatat dan tagihan sedang diverifikasi.',
                    },
                });
            }

            case 'book_kunjungan': {
                // --- ACTION: book_kunjungan - Booking Kunjungan Onsite ---
                const idSlot = formData.get('idSlot') as string;
                const emailOrangTua = formData.get('email') as string;
                const tanggalKedatangan = formData.get('tanggalKedatangan') as string;
                const jamKedatangan = formData.get('jamKedatangan') as string;

                if (!idSlot || !emailOrangTua) {
                    return NextResponse.json(
                        { success: false, error: 'ID slot dan email orang tua wajib diisi' },
                        { status: 400 }
                    );
                }

                // Cari keluarga berdasarkan email
                const keluarga = await prisma.keluarga.findUnique({
                    where: { email: emailOrangTua.toLowerCase().trim() },
                });

                if (!keluarga) {
                    return NextResponse.json(
                        { success: false, error: 'Data keluarga tidak ditemukan' },
                        { status: 404 }
                    );
                }

                // Cari slot jadwal
                const slotJadwal = await prisma.slotJadwal.findUnique({
                    where: { idSlot },
                });

                if (!slotJadwal) {
                    return NextResponse.json(
                        { success: false, error: 'Slot jadwal tidak ditemukan' },
                        { status: 404 }
                    );
                }

                // Cek apakah kuota tersedia
                if (slotJadwal.kuota <= 0) {
                    return NextResponse.json(
                        { success: false, error: 'Kuota slot jadwal ini telah habis' },
                        { status: 400 }
                    );
                }

                // Simpan data booking kunjungan
                const newBooking = await prisma.bookingKunjungan.create({
                    data: {
                        idKeluarga: keluarga.idKeluarga,
                        idSlot: idSlot,
                        status: 'MENUNGGU',
                    },
                });

                // Kurangi kuota pada slot jadwal
                await prisma.slotJadwal.update({
                    where: { idSlot },
                    data: {
                        kuota: { decrement: 1 },
                    },
                });

                return NextResponse.json({
                    success: true,
                    data: {
                        booking: newBooking,
                        slotSisa: slotJadwal.kuota - 1,
                        message: 'Booking kunjungan onsite berhasil tercatat.',
                    },
                });
            }

            case 'update_berkas_keluarga': {
                // --- ACTION: update_berkas_keluarga - Unggah ulang KK / KTP Orang Tua ---
                const emailKel = (formData.get('email') as string)?.toLowerCase().trim() || '';
                const jenisBerkas = formData.get('jenis') as string;
                const fileBerkas = formData.get('file');

                if (!emailKel) {
                    return NextResponse.json(
                        { success: false, error: 'Email keluarga wajib diisi.' },
                        { status: 400 }
                    );
                }

                if (jenisBerkas !== 'KK' && jenisBerkas !== 'KTP_ORTU') {
                    return NextResponse.json(
                        { success: false, error: 'Jenis berkas tidak valid. Harus KK atau KTP_ORTU.' },
                        { status: 400 }
                    );
                }

                if (!(fileBerkas instanceof File) || fileBerkas.size === 0) {
                    return NextResponse.json(
                        { success: false, error: 'File berkas wajib diunggah.' },
                        { status: 400 }
                    );
                }

                // Validasi tipe & ukuran file (maks 2 MB)
                const allowedExt = ['jpg', 'jpeg', 'png', 'pdf'];
                const extFile = (fileBerkas.name.split('.').pop() || '').toLowerCase();
                if (!allowedExt.includes(extFile)) {
                    return NextResponse.json(
                        { success: false, error: 'Format file harus JPG, PNG, atau PDF.' },
                        { status: 400 }
                    );
                }
                if (fileBerkas.size > 2 * 1024 * 1024) {
                    return NextResponse.json(
                        { success: false, error: 'Ukuran file maksimal 2 MB.' },
                        { status: 400 }
                    );
                }

                const keluargaBerkas = await prisma.keluarga.findUnique({
                    where: { email: emailKel },
                });

                if (!keluargaBerkas) {
                    return NextResponse.json(
                        { success: false, error: 'Data keluarga tidak ditemukan.' },
                        { status: 404 }
                    );
                }

                // Simpan file ke public/uploads (folder yang sama dengan registrasi)
                const uploadDirKel = path.join(process.cwd(), 'public/uploads');
                mkdirSync(uploadDirKel, { recursive: true });
                const prefix = jenisBerkas === 'KK' ? 'kk' : 'ktp';
                const bytesKel = await fileBerkas.arrayBuffer();
                const namaFileBaru = `${prefix}_${Date.now()}_${fileBerkas.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                await writeFile(path.join(uploadDirKel, namaFileBaru), Buffer.from(bytesKel));

                // Cari berkas lama (satu baris per jenis per keluarga), lalu update atau buat baru
                const berkasLama = await prisma.berkasKeluarga.findFirst({
                    where: { idKeluarga: keluargaBerkas.idKeluarga, jenis: jenisBerkas as any },
                });

                let berkasKel;
                if (berkasLama) {
                    berkasKel = await prisma.berkasKeluarga.update({
                        where: { idBerkasKel: berkasLama.idBerkasKel },
                        data: {
                            file: namaFileBaru,
                            statusVerifikasi: 'MENUNGGU', // Upload ulang = perlu verifikasi ulang
                        },
                    });

                    // Hapus file lama dari disk agar tidak menumpuk
                    const fileLamaPath = path.join(uploadDirKel, berkasLama.file);
                    if (fs.existsSync(fileLamaPath)) {
                        try { fs.unlinkSync(fileLamaPath); } catch { /* abaikan jika gagal */ }
                    }
                } else {
                    berkasKel = await prisma.berkasKeluarga.create({
                        data: {
                            idKeluarga: keluargaBerkas.idKeluarga,
                            jenis: jenisBerkas as any,
                            file: namaFileBaru,
                            statusVerifikasi: 'MENUNGGU',
                        },
                    });
                }

                return NextResponse.json({
                    success: true,
                    data: {
                        berkas: berkasKel,
                        message: jenisBerkas === 'KK'
                            ? 'Kartu Keluarga berhasil diunggah ulang.'
                            : 'KTP Orang Tua berhasil diunggah ulang.',
                    },
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Action tidak valid' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error POST /api/keluarga:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}