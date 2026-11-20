import { NextResponse } from 'next/server';
import { prisma, KELUARGA_AMAN } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { batalkanPendaftaranKedaluwarsa, hitungDeadline } from '@/lib/pendaftaran';
import { buatTagihanPendaftaran } from '@/lib/tagihan';

const KEPALA = 'KEPALA_SEKOLAH';

// GET /api/pendaftaran -> daftar calon siswa (penetapan penerimaan oleh kepala sekolah)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['KEPALA_SEKOLAH', 'BENDAHARA', 'SUPER_ADMIN'].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Hanya staf yang berwenang yang dapat melihat daftar calon siswa.' }, { status: 403 });
    }

    // Pendaftaran yang melewati batas bayar dibatalkan otomatis setiap kali
    // daftar dibuka, supaya tidak bergantung pada cron yang terpisah.
    // Kegagalan pembatalan tidak boleh menggagalkan pembacaan daftar.
    try {
      await batalkanPendaftaranKedaluwarsa(prisma);
    } catch (err) {
      console.error('Gagal membatalkan pendaftaran kedaluwarsa:', err);
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

    const { idAnak, aksi, alasanPenolakan, pengecualianBerkas } = await request.json();
    if (!idAnak || !['terima', 'tolak'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idAnak dan aksi (terima/tolak) wajib diisi.' }, { status: 400 });
    }
    if (aksi === 'tolak' && !alasanPenolakan?.trim()) {
      return NextResponse.json({ success: false, error: 'Alasan penolakan wajib diisi.' }, { status: 400 });
    }

    const anak = await prisma.anak.findUnique({
      where: { idAnak },
      include: { keluarga: true, tagihan: true, berkasAnak: true },
    });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Calon siswa tidak ditemukan.' }, { status: 404 });
    }

    // Penerimaan hanya boleh ditetapkan setelah berkas dinyatakan sah oleh kepala
    // sekolah. Pengecualian hanya berlaku bila sekolah mencatat alasannya.
    // Penetapan ulang (Perpanjang) tidak diulang syaratnya karena keputusan
    // penerimaan sudah pernah dibuat — cukup berkas pernah ada atau masih ada.
    if (aksi === 'terima') {
      const berkas = Array.isArray(anak.berkasAnak) ? anak.berkasAnak[0] : anak.berkasAnak;
      const berkasSah = berkas?.statusVerifikasi === 'DIVERIFIKASI';
      const sudahDiterima = Boolean(anak.deadlineBayar) || Boolean(anak.alasanPenolakan);
      if (!berkasSah && !sudahDiterima && !String(pengecualianBerkas || '').trim()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Berkas persyaratan belum diverifikasi. Setujui berkas pada menu Verifikasi Berkas terlebih dahulu, ' +
              'atau isi alasan pengecualian bila sekolah mengizinkan.',
          },
          { status: 409 }
        );
      }
    }

    const deadline = hitungDeadline();

    let updated;
    if (aksi === 'terima') {
      // Set deadline pembayaran 2 minggu, status tetap PENDAFTAR sampai bayar.
      // alasanPenolakan dikosongkan agar calon siswa yang sebelumnya ditolak
      // (termasuk ditolak otomatis karena lewat batas bayar) dapat diproses lagi.
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

      // Terbitkan ulang tagihan pendaftaran yang sempat dibatalkan, supaya
      // orang tua yang terlambat bayar tetap bisa melunasi.
      await prisma.tagihan.updateMany({
        where: { idAnak, jenis: 'PENDAFTARAN', status: 'DIBATALKAN' },
        data: { status: 'BELUM_BAYAR' },
      });

      // Calon siswa yang belum pernah punya tagihan pendaftaran (mis. didaftarkan
      // langsung oleh petugas tanpa melewati verifikasi berkas) juga harus punya
      // tagihan, kalau tidak orang tua tidak bisa membayar dan malah ditolak otomatis.
      await buatTagihanPendaftaran(prisma, idAnak);

      // Notifikasi ke orang tua: anak diterima, silakan bayar dalam 2 minggu
      const deadlineStr = deadline.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      await prisma.notifikasi.create({
        data: {
          idKeluarga: anak.idKeluarga,
          tipe: 'ANAK_DITERIMA',
          judul: 'Anak Diterima - Silakan Bayar Biaya Pendaftaran',
          pesan:
            `Selamat! ${anak.nama} telah diterima di TK Islam Nur Habib. Silakan bayar biaya pendaftaran ` +
            `dalam 2 minggu (sebelum ${deadlineStr}) agar status anak menjadi AKTIF.` +
            (pengecualianBerkas?.trim()
              ? ` Catatan: penerimaan ditetapkan dengan pengecualian berkas — ${String(pengecualianBerkas).trim()}`
              : ''),
          dataReferensi: JSON.stringify({
            idAnak: anak.idAnak,
            deadlineBayar: deadline.toISOString(),
            ...(pengecualianBerkas?.trim() ? { pengecualianBerkas: String(pengecualianBerkas).trim() } : {}),
          }),
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

// POST /api/pendaftaran -> jalankan pembatalan otomatis (dipanggil penjadwal)
export async function POST() {
  try {
    const hasil = await batalkanPendaftaranKedaluwarsa(prisma);
    return NextResponse.json({
      success: true,
      data: { dibatalkan: hasil.dibatalkan.length, rincian: hasil.dibatalkan, dilewati: hasil.dilewati },
      message: hasil.dibatalkan.length
        ? `${hasil.dibatalkan.length} pendaftaran dibatalkan karena melewati batas pembayaran.`
        : 'Tidak ada pendaftaran yang melewati batas pembayaran.',
    });
  } catch (error) {
    console.error('API Pendaftaran POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}