import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

// Cek apakah slot sudah lewat dari tanggal dan jam saat ini
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

  // Buat objek waktu lokal tepat untuk tanggal & jam slot
  const slotDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh || 0, mm || 0, 0);
  return slotDate.getTime() <= now.getTime();
}

// Ambil pengaturan hari onsite yang disetel bendahara (default: [3, 4, 5] -> Rabu, Kamis, Jumat)
async function ambilPengaturanHariOnsite(): Promise<number[]> {
  try {
    const row = await prisma.pengaturan.findUnique({
      where: { kunci: 'hari_kunjungan_onsite' },
    });
    if (row && row.nilai) {
      const parsed = JSON.parse(row.nilai);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(Number);
      }
    }
  } catch (e) {
    console.warn('Gagal membaca pengaturan hari onsite:', e);
  }
  return [3, 4, 5]; // Default: Rabu (3), Kamis (4), Jumat (5)
}

// Helper membuat slot mingguan sesuai hari yang disetel bendahara
async function buatSlotSesuaiHari(hariList: number[] = [3, 4, 5], minggu = 2) {
  const jamList = ['08:30', '10:00', '13:00'];
  const now = new Date();
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const slotsToCreate: { tanggal: Date; jam: Date; kuota: number }[] = [];

  for (let i = 0; i <= minggu * 7; i++) {
    const d = new Date(hariIni);
    d.setDate(hariIni.getDate() + i);
    const day = d.getDay();
    if (!hariList.includes(day)) continue;

    const tglStr = d.toISOString().split('T')[0];
    const tglDate = new Date(tglStr + 'T00:00:00');

    for (const j of jamList) {
      const jamDate = new Date(`2000-01-01T${j}:00Z`);

      // Lewati jika waktu slot tersebut sudah lewat dari jam saat ini
      if (slotSudahLewat({ tanggal: tglDate, jam: jamDate }, now)) {
        continue;
      }

      const ada = await prisma.slotJadwal.findFirst({
        where: { tanggal: tglDate, jam: jamDate },
      });
      if (!ada) {
        slotsToCreate.push({
          tanggal: tglDate,
          jam: jamDate,
          kuota: 5,
        });
      }
    }
  }

  if (slotsToCreate.length > 0) {
    await prisma.slotJadwal.createMany({ data: slotsToCreate });
  }
}

// GET /api/slot-jadwal            -> list semua slot (publik, dibuka orang tua)
// GET /api/slot-jadwal?future=1   -> hanya slot masa depan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const future = searchParams.get('future') === '1';
    const now = new Date();

    // 1. OTOMATIS HAPUS: Bersihkan semua slot dan booking kunjungan yang sudah lewat (tanggal & jam sudah terlewati)
    try {
      const allExistingSlots = await prisma.slotJadwal.findMany();
      const expiredIds = allExistingSlots
        .filter((s) => slotSudahLewat(s, now))
        .map((s) => s.idSlot);

      if (expiredIds.length > 0) {
        await prisma.bookingKunjungan.deleteMany({
          where: { idSlot: { in: expiredIds } },
        });
        await prisma.slotJadwal.deleteMany({
          where: { idSlot: { in: expiredIds } },
        });
      }
    } catch (cleanErr) {
      console.warn('Gagal membersihkan slot masa lalu:', cleanErr);
    }

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    const where: Record<string, unknown> = {};
    if (future) {
      where.tanggal = { gte: hariIni };
    }

    let data = await prisma.slotJadwal.findMany({
      where,
      orderBy: [{ tanggal: 'asc' }, { jam: 'asc' }],
      include: {
        _count: { select: { bookingKunjungan: true } },
      },
    });

    // Filter tambahan untuk memastikan slot hari ini yang jamnya sudah lewat tidak tampil
    data = data.filter((s) => !slotSudahLewat(s, now));

    const hariSetting = await ambilPengaturanHariOnsite();

    // 2. OTOMATIS MUAT ULANG: Jika slot mendatang kosong, regenerasi otomatis sesuai hari yang disetel bendahara (Rabu, Kamis, Jumat)
    if (future && data.length === 0) {
      await buatSlotSesuaiHari(hariSetting, 2);
      data = await prisma.slotJadwal.findMany({
        where,
        orderBy: [{ tanggal: 'asc' }, { jam: 'asc' }],
        include: {
          _count: { select: { bookingKunjungan: true } },
        },
      });
      data = data.filter((s) => !slotSudahLewat(s, now));
    }

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

    return NextResponse.json({
      success: true,
      data: slotDenganKuota,
      pengaturanHari: hariSetting,
    });
  } catch (error) {
    console.error('API SlotJadwal GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/slot-jadwal -> buat slot baru, simpan pengaturan hari, atau muat ulang (BENDAHARA & KEPALA_SEKOLAH)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || (sesi.peran !== 'KEPALA_SEKOLAH' && sesi.peran !== 'BENDAHARA')) {
      return NextResponse.json(
        { success: false, error: 'Hanya bendahara atau kepala sekolah yang dapat mengelola slot.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Aksi 1: Simpan pengaturan hari onsite oleh bendahara & otomatis sinkronkan jadwal
    if (body.action === 'simpan_pengaturan_hari') {
      const hariAktif: number[] = Array.isArray(body.hariAktif) ? body.hariAktif.map(Number) : [3, 4, 5];

      await prisma.pengaturan.upsert({
        where: { kunci: 'hari_kunjungan_onsite' },
        update: { nilai: JSON.stringify(hariAktif) },
        create: {
          kunci: 'hari_kunjungan_onsite',
          nilai: JSON.stringify(hariAktif),
          keterangan: 'Hari aktif jadwal kunjungan onsite sekolah',
        },
      });

      // Muat ulang slot untuk hari-hari tersebut
      await buatSlotSesuaiHari(hariAktif, Number(body.minggu) || 2);

      return NextResponse.json({
        success: true,
        message: 'Pengaturan hari kunjungan onsite berhasil disimpan dan jadwal telah diperbarui.',
        hariAktif,
      });
    }

    // Aksi 2: Muat ulang slot sesuai pengaturan hari yang tersimpan
    if (body.action === 'muat_ulang_rabu_kamis_jumat') {
      const hariSetting = await ambilPengaturanHariOnsite();
      await buatSlotSesuaiHari(hariSetting, Number(body.minggu) || 2);
      return NextResponse.json({
        success: true,
        message: 'Jadwal kunjungan onsite berhasil dimuat ulang sesuai jadwal sekolah.',
      });
    }

    // Aksi 3: Tambah slot tunggal manual
    const { tanggal, jam, kuota } = body;

    if (!tanggal || !jam || !kuota) {
      return NextResponse.json(
        { success: false, error: 'Tanggal, jam, dan kuota wajib diisi.' },
        { status: 400 }
      );
    }

    const tglDate = new Date(tanggal + 'T00:00:00');
    const jamDate = new Date(`2000-01-01T${jam}:00Z`);

    if (slotSudahLewat({ tanggal: tglDate, jam: jamDate })) {
      return NextResponse.json(
        { success: false, error: 'Tanggal dan jam kunjungan harus masa depan (belum terlewati).' },
        { status: 422 }
      );
    }

    if (Number(kuota) <= 0) {
      return NextResponse.json({ success: false, error: 'Kuota minimal 1.' }, { status: 400 });
    }

    const slot = await prisma.slotJadwal.create({
      data: {
        tanggal: tglDate,
        jam: jamDate,
        kuota: Number(kuota),
      },
    });

    return NextResponse.json({ success: true, data: slot, message: 'Slot jadwal berhasil dibuat.' });
  } catch (error) {
    console.error('API SlotJadwal POST Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/slot-jadwal -> edit slot (BENDAHARA & KEPALA_SEKOLAH)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || (sesi.peran !== 'KEPALA_SEKOLAH' && sesi.peran !== 'BENDAHARA')) {
      return NextResponse.json(
        { success: false, error: 'Hanya bendahara atau kepala sekolah yang dapat mengedit slot.' },
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

    let tglBaru: Date | undefined;
    let jamBaru: Date | undefined;

    if (tanggal) tglBaru = new Date(tanggal + 'T00:00:00');
    if (jam) jamBaru = new Date(`2000-01-01T${jam}:00Z`);

    if (tglBaru || jamBaru) {
      const cekTgl = tglBaru || slot.tanggal;
      const cekJam = jamBaru || slot.jam;
      if (slotSudahLewat({ tanggal: cekTgl, jam: cekJam })) {
        return NextResponse.json(
          { success: false, error: 'Tanggal dan jam kunjungan harus masa depan.' },
          { status: 422 }
        );
      }
    }

    const updated = await prisma.slotJadwal.update({
      where: { idSlot },
      data: {
        tanggal: tglBaru,
        jam: jamBaru,
        kuota: kuota ? Number(kuota) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Slot jadwal berhasil diperbarui.' });
  } catch (error) {
    console.error('API SlotJadwal PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/slot-jadwal?idSlot=... -> hapus slot (BENDAHARA & KEPALA_SEKOLAH)
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || (sesi.peran !== 'KEPALA_SEKOLAH' && sesi.peran !== 'BENDAHARA')) {
      return NextResponse.json(
        { success: false, error: 'Hanya bendahara atau kepala sekolah yang dapat menghapus slot.' },
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
      const bookingAktif = await prisma.bookingKunjungan.count({
        where: { idSlot, status: { not: 'DIBATALKAN' } },
      });
      if (bookingAktif > 0) {
        return NextResponse.json(
          { success: false, error: 'Slot tidak dapat dihapus karena masih ada pemesanan aktif.' },
          { status: 409 }
        );
      }
      // Hapus data booking yang sudah dibatalkan
      await prisma.bookingKunjungan.deleteMany({ where: { idSlot } });
    }

    await prisma.slotJadwal.delete({ where: { idSlot } });

    return NextResponse.json({ success: true, message: 'Slot jadwal berhasil dihapus.' });
  } catch (error) {
    console.error('API SlotJadwal DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
