import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StatusBooking } from '@/app/generated/prisma/client';
import { sesiSekarang } from '@/lib/sesi';

// GET /api/booking-kunjungan -> daftar booking
// ORANG_TUA: hanya milik sendiri. KEPALA_SEKOLAH: semua.
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const where =
      sesi.peran === 'ORANG_TUA'
        ? { idKeluarga: sesi.id }
        : sesi.peran === 'KEPALA_SEKOLAH'
          ? {}
          : null;

    if (!where) {
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

    return NextResponse.json({ success: true, data });
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

    const { idSlot } = await request.json();
    if (!idSlot) {
      return NextResponse.json({ success: false, error: 'idSlot wajib diisi.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.findUnique({ where: { idSlot } });
    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot tidak ditemukan.' }, { status: 404 });
    }

    // Slot harus masa depan
    if (new Date(slot.tanggal) < new Date(new Date().toISOString().split('T')[0])) {
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
      data: { idKeluarga: sesi.id, idSlot, status: 'MENUNGGU' },
      include: { slot: true },
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

// PATCH /api/booking-kunjungan -> konfirmasi/batalkan/selesai (KEPALA_SEKOLAH)
//                              -> batal sendiri (ORANG_TUA)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const { idBooking, status } = await request.json();

    if (!idBooking || !status) {
      return NextResponse.json({ success: false, error: 'idBooking dan status wajib diisi.' }, { status: 400 });
    }

    const statusValid = ['MENUNGGU', 'DIKONFIRMASI', 'DIBATALKAN', 'SELESAI'];
    if (!statusValid.includes(status)) {
      return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });
    }

    const booking = await prisma.bookingKunjungan.findUnique({ where: { idBooking } });
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
    } else if (sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const updated = await prisma.bookingKunjungan.update({
      where: { idBooking },
      data: { status: status as StatusBooking },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Status booking diperbarui.' });
  } catch (error) {
    console.error('API BookingKunjungan PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
