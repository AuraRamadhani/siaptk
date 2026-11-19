import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StatusBooking, JenisBooking } from '@/app/generated/prisma/client';
import { sesiSekarang } from '@/lib/sesi';

// Cek apakah slot kunjungan sudah terlewati dari waktu sekarang
function slotSudahLewat(slot: { tanggal: Date | string; jam: Date | string }, now = new Date()): boolean {
  const d = new Date(slot.tanggal);
  const jStr =
    typeof slot.jam === 'string'
      ? slot.jam
      : slot.jam instanceof Date
      ? slot.jam.toISOString()
      : String(slot.jam);
  const timePart = jStr.includes('T') ? jStr.split('T')[1].slice(0, 5) : jStr.slice(0, 5);
  const [hh, mm] = timePart.split(':').map(Number);
  const slotDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh || 0, mm || 0, 0);
  return slotDate.getTime() <= now.getTime();
}

// GET /api/booking-kunjungan -> daftar booking
// ORANG_TUA: hanya milik sendiri & aktif. KEPALA_SEKOLAH/BENDAHARA: semua yang aktif.
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const now = new Date();
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    let where: Record<string, unknown> = {};
    if (sesi.peran === 'ORANG_TUA') {
      where = {
        idKeluarga: sesi.id,
        status: { not: 'DIBATALKAN' },
        slot: { tanggal: { gte: hariIni } },
      };
    } else if (sesi.peran === 'KEPALA_SEKOLAH' || sesi.peran === 'BENDAHARA') {
      where = {
        slot: { tanggal: { gte: hariIni } },
      };
    } else {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const data = await prisma.bookingKunjungan.findMany({
      where,
      orderBy: { slot: { tanggal: 'asc' } },
      include: {
        slot: true,
        keluarga: { select: { namaAyah: true, namaIbu: true, noHp: true } },
      },
    });

    // Otomatis saring agar jadwal kunjungan yang sudah lewat jam/harinya tidak muncul
    const dataAktif = data.filter((b) => !slotSudahLewat(b.slot, now));

    return NextResponse.json({ success: true, data: dataAktif });
  } catch (error) {
    console.error('API BookingKunjungan GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/booking-kunjungan -> pesan slot (ORANG_TUA only)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'ORANG_TUA') {
      return NextResponse.json(
        { success: false, error: 'Hanya orang tua yang dapat memesan kunjungan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { idSlot, jenisBooking, catatanOrangTua } = body;

    if (!idSlot) {
      return NextResponse.json({ success: false, error: 'idSlot wajib diisi.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.findUnique({ where: { idSlot } });
    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot tidak ditemukan.' }, { status: 404 });
    }

    // Slot harus masa depan
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    if (new Date(slot.tanggal) < hariIni) {
      return NextResponse.json({ success: false, error: 'Slot sudah lewat.' }, { status: 422 });
    }

    // Cek kuota
    const terpakai = await prisma.bookingKunjungan.count({
      where: { idSlot, status: { not: 'DIBATALKAN' } },
    });
    if (terpakai >= slot.kuota) {
      return NextResponse.json({ success: false, error: 'Kuota slot sudah penuh.' }, { status: 422 });
    }

    // Cegah double booking: keluarga sama tidak boleh pesan slot sama
    const sudahPesan = await prisma.bookingKunjungan.findFirst({
      where: {
        idKeluarga: sesi.id,
        idSlot,
        status: { not: 'DIBATALKAN' },
      },
    });
    if (sudahPesan) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah memesan slot ini.' },
        { status: 409 }
      );
    }

    const booking = await prisma.bookingKunjungan.create({
      data: {
        idKeluarga: sesi.id,
        idSlot,
        jenisBooking: (jenisBooking as JenisBooking) || 'UMUM',
        catatanOrangTua: catatanOrangTua || null,
        status: 'MENUNGGU',
      },
      include: { slot: true },
    });

    // Notifikasi ke bendahara/kepala sekolah (opsional, via sistem notifikasi global)
    // Di sini kita kirim notifikasi ke orang tua sebagai konfirmasi
    await prisma.notifikasi.create({
      data: {
        idKeluarga: sesi.id,
        tipe: 'BOOKING_DIKONFIRMASI',
        judul: 'Booking Kunjungan Berhasil',
        pesan: `Booking kunjungan untuk ${booking.jenisBooking === 'BAYAR_SPP' ? 'Pembayaran SPP' : booking.jenisBooking === 'SETOR_TABUNGAN' ? 'Setoran Tabungan' : 'Kunjungan Umum'} pada ${new Date(slot.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} pukul ${slot.jam.toISOString().slice(11, 16)} WIB telah dikirim. Menunggu konfirmasi.`,
        dataReferensi: JSON.stringify({ idBooking: booking.idBooking, jenisBooking: booking.jenisBooking }),
      },
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Pemesanan berhasil, menunggu konfirmasi.',
    });
  } catch (error) {
    console.error('API BookingKunjungan POST Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/booking-kunjungan -> konfirmasi/batalkan/selesai (KEPALA_SEKOLAH/BENDAHARA)
//                              -> batal sendiri (ORANG_TUA)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const { idBooking, status, catatanBendahara } = await request.json();

    if (!idBooking || !status) {
      return NextResponse.json({ success: false, error: 'idBooking dan status wajib diisi.' }, { status: 400 });
    }

    const statusValid: StatusBooking[] = ['MENUNGGU', 'DIKONFIRMASI', 'DIBATALKAN', 'SELESAI'];
    if (!statusValid.includes(status)) {
      return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });
    }

    const booking = await prisma.bookingKunjungan.findUnique({
      where: { idBooking },
      include: { slot: true, keluarga: true },
    });
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking tidak ditemukan.' }, { status: 404 });
    }

    // Orang tua hanya boleh membatalkan miliknya sendiri
    if (sesi.peran === 'ORANG_TUA') {
      if (booking.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Booking bukan milik akun ini.' }, { status: 403 });
      }
      if (status !== 'DIBATALKAN') {
        return NextResponse.json(
          { success: false, error: 'Orang tua hanya dapat membatalkan booking.' },
          { status: 403 }
        );
      }
    } else if (sesi.peran !== 'KEPALA_SEKOLAH' && sesi.peran !== 'BENDAHARA') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const updated = await prisma.bookingKunjungan.update({
      where: { idBooking },
      data: {
        status: status as StatusBooking,
        catatanBendahara: catatanBendahara || booking.catatanBendahara,
      },
      include: { slot: true, keluarga: true },
    });

    // Notifikasi ke orang tua
    const tipeNotif = status === 'DIBATALKAN' ? 'BOOKING_DIBATALKAN' : 'BOOKING_DIKONFIRMASI';
    const judulNotif = status === 'DIBATALKAN' ? 'Booking Dibatalkan' : 'Booking Dikonfirmasi';
    let pesanNotif = '';
    if (status === 'DIKONFIRMASI') {
      pesanNotif = `Booking kunjungan Anda untuk ${booking.jenisBooking === 'BAYAR_SPP' ? 'Pembayaran SPP' : booking.jenisBooking === 'SETOR_TABUNGAN' ? 'Setoran Tabungan' : 'Kunjungan Umum'} pada ${new Date(booking.slot.tanggal).toLocaleDateString('id-ID')} pukul ${booking.slot.jam.toISOString().slice(11, 16)} WIB telah dikonfirmasi. Silakan datang tepat waktu.`;
    } else if (status === 'SELESAI') {
      pesanNotif = `Kunjungan Anda untuk ${booking.jenisBooking === 'BAYAR_SPP' ? 'Pembayaran SPP' : booking.jenisBooking === 'SETOR_TABUNGAN' ? 'Setoran Tabungan' : 'Kunjungan Umum'} telah selesai. Terima kasih.`;
    } else if (status === 'DIBATALKAN') {
      pesanNotif = `Booking kunjungan Anda untuk ${booking.jenisBooking === 'BAYAR_SPP' ? 'Pembayaran SPP' : booking.jenisBooking === 'SETOR_TABUNGAN' ? 'Setoran Tabungan' : 'Kunjungan Umum'} telah dibatalkan.${catatanBendahara ? ` Catatan: ${catatanBendahara}` : ''}`;
    }

    if (pesanNotif) {
      await prisma.notifikasi.create({
        data: {
          idKeluarga: booking.idKeluarga,
          tipe: tipeNotif,
          judul: judulNotif,
          pesan: pesanNotif,
          dataReferensi: JSON.stringify({ idBooking: booking.idBooking, status }),
        },
      });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Status booking diperbarui.' });
  } catch (error) {
    console.error('API BookingKunjungan PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}