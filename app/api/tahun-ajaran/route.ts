import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { periodeBerikutnya } from '@/lib/kenaikan';

const BOLEH = ['KEPALA_SEKOLAH', 'SUPER_ADMIN'];

// GET /api/tahun-ajaran -> daftar tahun ajaran, terbaru di atas
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const data = await prisma.tahunAjaran.findMany({
      orderBy: { periode: 'desc' },
      include: { _count: { select: { riwayatKelompok: true } } },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API TahunAjaran GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/tahun-ajaran -> buat tahun ajaran baru
// body: { periode?: "2027/2028", aktifkan?: boolean }
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { periode, aktifkan } = body as { periode?: string; aktifkan?: boolean };

    const terakhir = await prisma.tahunAjaran.findFirst({ orderBy: { periode: 'desc' } });

    let periodeFinal = String(periode || '').trim();
    if (!periodeFinal) {
      // Tanpa masukan: lanjutkan otomatis dari periode terakhir.
      const lanjut = terakhir ? periodeBerikutnya(terakhir.periode) : null;
      if (!lanjut) {
        return NextResponse.json(
          { success: false, error: 'Periode wajib diisi (contoh: 2027/2028).' },
          { status: 400 }
        );
      }
      periodeFinal = lanjut;
    }

    if (!/^\d{4}\s*\/\s*\d{4}$/.test(periodeFinal)) {
      return NextResponse.json(
        { success: false, error: 'Format periode harus TAHUN/TAHUN, contoh 2027/2028.' },
        { status: 400 }
      );
    }

    const sudahAda = await prisma.tahunAjaran.findFirst({ where: { periode: periodeFinal } });
    if (sudahAda) {
      return NextResponse.json(
        { success: false, error: `Tahun ajaran ${periodeFinal} sudah ada.` },
        { status: 409 }
      );
    }

    // Acuan hitung usia: 1 Juli tahun awal periode.
    // Disimpan pada tengah hari UTC supaya tanggalnya tidak bergeser
    // saat dibaca kembali di zona waktu mana pun.
    const tahunAwal = Number(periodeFinal.slice(0, 4));
    const tanggalAcuan = new Date(Date.UTC(tahunAwal, 6, 1, 12, 0, 0));

    const dibuat = await prisma.$transaction(async (tx) => {
      if (aktifkan) {
        await tx.tahunAjaran.updateMany({ where: { statusAktif: true }, data: { statusAktif: false } });
      }
      return tx.tahunAjaran.create({
        data: { periode: periodeFinal, statusAktif: Boolean(aktifkan), tanggalAcuan },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: dibuat,
        message: `Tahun ajaran ${periodeFinal} dibuat${aktifkan ? ' dan diaktifkan' : ''}. Acuan usia 1 Juli ${tahunAwal}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API TahunAjaran POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/tahun-ajaran -> aktifkan satu tahun ajaran
// body: { idTahunAjaran }
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { idTahunAjaran } = await request.json();
    if (!idTahunAjaran) {
      return NextResponse.json({ success: false, error: 'idTahunAjaran wajib diisi.' }, { status: 400 });
    }

    const ada = await prisma.tahunAjaran.findUnique({ where: { idTahunAjaran } });
    if (!ada) {
      return NextResponse.json({ success: false, error: 'Tahun ajaran tidak ditemukan.' }, { status: 404 });
    }

    const hasil = await prisma.$transaction(async (tx) => {
      await tx.tahunAjaran.updateMany({ where: { statusAktif: true }, data: { statusAktif: false } });
      return tx.tahunAjaran.update({ where: { idTahunAjaran }, data: { statusAktif: true } });
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: `Tahun ajaran ${hasil.periode} diaktifkan.`,
    });
  } catch (error) {
    console.error('API TahunAjaran PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
