import { NextResponse } from 'next/server';
import { prisma, KELUARGA_AMAN } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

const KEPALA = 'KEPALA_SEKOLAH';

const DEADLINE_HARI = 14; // 2 minggu

// GET /api/pendaftaran -> daftar calon siswa (penetapan penerimaan oleh kepala sekolah)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['KEPALA_SEKOLAH', 'BENDAHARA', 'SUPER_ADMIN'].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Hanya staf yang berwenang yang dapat melihat daftar calon siswa.' }, { status: 403 });
    }

    const data = await prisma.anak.findMany({
      where: { status: 'PENDAFTAR' },
      orderBy: { nama: 'asc' },
      include: {
        keluarga: { select: KELUARGA_AMAN },
        berkasAnak: true,
        tagihan: true,
        riwayatKelompok: { include: { kelompok: true } },
      },
    });
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API Pendaftaran GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/pendaftaran -> penetapan penerimaan (terima = set deadline bayar, tolak = catat alasan)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== KEPALA) {
      return NextResponse.json({ success: false, error: 'Hanya kepala sekolah yang dapat memutuskan penerimaan.' }, { status: 403 });
    }

    const { idAnak, aksi, alasanPenolakan } = await request.json();
    if (!idAnak || !['terima', 'tolak'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idAnak dan aksi (terima/tolak) wajib diisi.' }, { status: 400 });
    }
    if (aksi === 'tolak' && !alasanPenolakan?.trim()) {
      return NextResponse.json({ success: false, error: 'Alasan penolakan wajib diisi.' }, { status: 400 });
    }

    const anak = await prisma.anak.findUnique({
      where: { idAnak },
      include: { keluarga: true, tagihan: true },
    });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Calon siswa tidak ditemukan.' }, { status: 404 });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + DEADLINE_HARI);

    let updated;
    if (aksi === 'terima') {
      // Set deadline pembayaran 2 minggu, status tetap PENDAFTAR sampai bayar
      updated = await prisma.anak.update({
        where: { idAnak },
        data: {
          deadlineBayar: deadline,
          alasanPenolakan: null,
        },
      });

      // Pastikan rekening tabungan ada
      await prisma.rekeningTabungan.upsert({
        where: { idAnak },
        update: {},
        create: { idAnak, saldo: 0 },
      });

      // Notifikasi ke orang tua: anak diterima, silakan bayar dalam 2 minggu
      const deadlineStr = deadline.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      await prisma.notifikasi.create({
        data: {
          idKeluarga: anak.idKeluarga,
          tipe: 'ANAK_DITERIMA',
          judul: 'Anak Diterima - Silakan Bayar Biaya Pendaftaran',
          pesan: `Selamat! ${anak.nama} telah diterima di TK Islam Nur Habib. Silakan bayar biaya pendaftaran dalam 2 minggu (sebelum ${deadlineStr}) agar status anak menjadi AKTIF.`,
          dataReferensi: JSON.stringify({ idAnak: anak.idAnak, deadlineBayar: deadline.toISOString() }),
        },
      });
    } else {
      // Tolak: catat alasan, hapus deadline, status tetap PENDAFTAR (bisa daftar ulang)
      updated = await prisma.anak.update({
        where: { idAnak },
        data: {
          deadlineBayar: null,
          alasanPenolakan,
        },
      });

      // Notifikasi ke orang tua: anak ditolak
      await prisma.notifikasi.create({
        data: {
          idKeluarga: anak.idKeluarga,
          tipe: 'ANAK_DITOLAK',
          judul: 'Pendaftaran Ditolak',
          pesan: `Mohon maaf, pendaftaran ${anak.nama} tidak dapat diproses. Alasan: ${alasanPenolakan}`,
          dataReferensi: JSON.stringify({ idAnak: anak.idAnak, alasan: alasanPenolakan }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: aksi === 'terima'
        ? `Siswa ditetapkan sebagai calon siswa. Deadline pembayaran: ${deadline.toLocaleDateString('id-ID')}.`
        : 'Penolakan dicatat dengan alasan.',
    });
  } catch (error) {
    console.error('API Pendaftaran PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/pendaftaran -> cek deadline pembayaran (dipakai cron/scheduler)
export async function POST() {
  try {
    // Endpoint ini bisa dipanggil oleh cron job untuk cek deadline
    const now = new Date();
    const anakExpired = await prisma.anak.findMany({
      where: {
        status: 'PENDAFTAR',
        deadlineBayar: { lt: now },
      },
      include: { keluarga: true },
    });

    for (const anak of anakExpired) {
      // Batalkan tagihan pendaftaran
      await prisma.tagihan.updateMany({
        where: { idAnak: anak.idAnak, jenis: 'PENDAFTARAN' },
        data: { status: 'DIBATALKAN' },
      });
      // Hapus deadline
      await prisma.anak.update({
        where: { idAnak: anak.idAnak },
        data: { deadlineBayar: null },
      });
      // Notifikasi
      await prisma.notifikasi.create({
        data: {
          idKeluarga: anak.idKeluarga,
          tipe: 'DEADLINE_PEMBAYARAN',
          judul: 'Batas Waktu Pembayaran Habis',
          pesan: `Batas waktu pembayaran biaya pendaftaran untuk ${anak.nama} telah habis. Pendaftaran dibatalkan. Silakan hubungi sekolah untuk pendaftaran ulang.`,
          dataReferensi: JSON.stringify({ idAnak: anak.idAnak }),
        },
      });
    }

    return NextResponse.json({ success: true, data: { dibatalkan: anakExpired.length } });
  } catch (error) {
    console.error('API Pendaftaran POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}