import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

// GET /api/slot-jadwal            -> list semua slot (publik, dibuka orang tua)
// GET /api/slot-jadwal?future=1   -> hanya slot masa depan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const future = searchParams.get('future') === '1';

    const where: Record<string, unknown> = {};
    if (future) {
      // Kolom tanggal bertipe Date; kirim objek Date, bukan string ISO.
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      where.tanggal = { gte: hariIni };
    }

    const data = await prisma.slotJadwal.findMany({
      where,
      orderBy: { tanggal: 'asc' },
      include: {
        _count: { select: { bookingKunjungan: true } },
      },
    });

    // Hitung sisa kuota per slot
    const slotDenganKuota = await Promise.all(
      data.map(async (slot) => {
        const jumlahBooking = await prisma.bookingKunjungan.count({
          where: { idSlot: slot.idSlot, status: { not: 'DIBATALKAN' } },
        });
        return {
          ...slot,
          sisa: Math.max(0, slot.kuota - jumlahBooking),
        };
      })
    );

    return NextResponse.json({ success: true, data: slotDenganKuota });
  } catch (error) {
    console.error('API SlotJadwal GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/slot-jadwal -> buat slot baru (KEPALA_SEKOLAH only)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat membuat slot.' },
        { status: 403 }
      );
    }

    const { tanggal, jam, kuota } = await request.json();

    if (!tanggal || !jam || !kuota) {
      return NextResponse.json(
        { success: false, error: 'Tanggal, jam, dan kuota wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi tanggal >= hari ini
    const hariIni = new Date().toISOString().split('T')[0];
    if (tanggal < hariIni) {
      return NextResponse.json(
        { success: false, error: 'Tanggal harus masa depan.' },
        { status: 422 }
      );
    }

    if (Number(kuota) <= 0) {
      return NextResponse.json({ success: false, error: 'Kuota minimal 1.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.create({
      data: {
        tanggal: new Date(tanggal + 'T00:00:00'),
        jam: new Date(`2000-01-01T${jam}:00`),
        kuota: Number(kuota),
      },
    });

    return NextResponse.json({ success: true, data: slot, message: 'Slot jadwal dibuat.' });
  } catch (error) {
    console.error('API SlotJadwal POST Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/slot-jadwal -> edit slot (KEPALA_SEKOLAH only)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat mengedit slot.' },
        { status: 403 }
      );
    }

    const { idSlot, tanggal, jam, kuota } = await request.json();

    if (!idSlot) {
      return NextResponse.json({ success: false, error: 'idSlot wajib diisi.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.findUnique({ where: { idSlot } });
    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot tidak ditemukan.' }, { status: 404 });
    }

    const hariIni = new Date().toISOString().split('T')[0];
    if (tanggal && tanggal < hariIni) {
      return NextResponse.json(
        { success: false, error: 'Tanggal harus masa depan.' },
        { status: 422 }
      );
    }

    const updated = await prisma.slotJadwal.update({
      where: { idSlot },
      data: {
        tanggal: tanggal ? new Date(tanggal + 'T00:00:00') : undefined,
        jam: jam ? new Date(`2000-01-01T${jam}:00`) : undefined,
        kuota: kuota ? Number(kuota) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Slot jadwal diperbarui.' });
  } catch (error) {
    console.error('API SlotJadwal PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/slot-jadwal?idSlot=... -> hapus slot (KEPALA_SEKOLAH only)
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat menghapus slot.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idSlot = searchParams.get('idSlot');

    if (!idSlot) {
      return NextResponse.json({ success: false, error: 'idSlot wajib diisi.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.findUnique({
      where: { idSlot },
      include: { _count: { select: { bookingKunjungan: true } } },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot tidak ditemukan.' }, { status: 404 });
    }

    if (slot._count.bookingKunjungan > 0) {
      return NextResponse.json(
        { success: false, error: 'Slot tidak dapat dihapus karena sudah ada pemesanan.' },
        { status: 409 }
      );
    }

    await prisma.slotJadwal.delete({ where: { idSlot } });

    return NextResponse.json({ success: true, message: 'Slot jadwal dihapus.' });
  } catch (error) {
    console.error('API SlotJadwal DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
