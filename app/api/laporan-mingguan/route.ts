import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

// GET /api/laporan-mingguan -> list laporan milik guru (GURU only)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'GURU') {
      return NextResponse.json({ success: false, error: 'Hanya guru yang dapat melihat laporan.' }, { status: 403 });
    }

    const tahunAktif = await prisma.tahunAjaran.findFirst({ where: { statusAktif: true } });
    if (!tahunAktif) {
      return NextResponse.json({ success: false, error: 'Belum ada tahun ajaran aktif.' }, { status: 404 });
    }

    // Siswa di kelas guru (dari riwayatKelompok tahun aktif)
    // Asumsi: satu guru mengajar satu kelompok, atau semua siswa AKTIF terlihat guru
    // Untuk kemudahan sekarang: guru lihat laporan semua siswa AKTIF tahun ini
    const laporan = await prisma.laporanMingguan.findMany({
      orderBy: { tema: { mingguKe: 'asc' } },
      include: {
        anak: {
          include: {
            keluarga: { select: { namaAyah: true, namaIbu: true } },
            riwayatKelompok: { include: { kelompok: true } },
          },
        },
        tema: true,
      },
    });

    return NextResponse.json({ success: true, data: laporan });
  } catch (error) {
    console.error('API Laporan GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/laporan-mingguan -> input laporan baru
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'GURU') {
      return NextResponse.json({ success: false, error: 'Hanya guru yang dapat input laporan.' }, { status: 403 });
    }

    const { idAnak, idTema, aspek, catatanKegiatan } = await request.json();
    if (!idAnak || !idTema || !aspek || !catatanKegiatan) {
      return NextResponse.json(
        { success: false, error: 'idAnak, idTema, aspek, dan catatan kegiatan wajib diisi.' },
        { status: 400 }
      );
    }

    const valid = ['SOSIAL', 'KOGNITIF', 'MOTORIK', 'EMOSI'];
    if (!valid.includes(String(aspek).toUpperCase())) {
      return NextResponse.json(
        { success: false, error: `Aspek harus: ${valid.join(', ')}` },
        { status: 400 }
      );
    }

    const anak = await prisma.anak.findUnique({ where: { idAnak } });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan.' }, { status: 404 });
    }

    const tema = await prisma.temaPembelajaran.findUnique({ where: { idTema } });
    if (!tema) {
      return NextResponse.json({ success: false, error: 'Tema tidak ditemukan.' }, { status: 404 });
    }

    const laporan = await prisma.laporanMingguan.create({
      data: {
        idAnak,
        idTema,
        aspek: String(aspek).toUpperCase(),
        catatanKegiatan: String(catatanKegiatan).trim(),
      },
      include: { anak: true, tema: true },
    });

    return NextResponse.json({ success: true, data: laporan, message: 'Laporan ditambahkan.' });
  } catch (error) {
    console.error('API Laporan POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/laporan-mingguan -> edit laporan
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'GURU') {
      return NextResponse.json({ success: false, error: 'Hanya guru yang dapat edit laporan.' }, { status: 403 });
    }

    const { idLaporan, aspek, catatanKegiatan } = await request.json();
    if (!idLaporan) {
      return NextResponse.json({ success: false, error: 'idLaporan wajib diisi.' }, { status: 400 });
    }

    const laporan = await prisma.laporanMingguan.findUnique({ where: { idLaporan } });
    if (!laporan) {
      return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    if (aspek) {
      const valid = ['SOSIAL', 'KOGNITIF', 'MOTORIK', 'EMOSI'];
      if (!valid.includes(String(aspek).toUpperCase())) {
        return NextResponse.json(
          { success: false, error: `Aspek harus: ${valid.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.laporanMingguan.update({
      where: { idLaporan },
      data: {
        aspek: aspek ? String(aspek).toUpperCase() : undefined,
        catatanKegiatan: catatanKegiatan ? String(catatanKegiatan).trim() : undefined,
      },
      include: { anak: true, tema: true },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Laporan diperbarui.' });
  } catch (error) {
    console.error('API Laporan PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/laporan-mingguan?idLaporan=...
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'GURU') {
      return NextResponse.json({ success: false, error: 'Hanya guru yang dapat hapus laporan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idLaporan = searchParams.get('idLaporan');
    if (!idLaporan) {
      return NextResponse.json({ success: false, error: 'idLaporan wajib diisi.' }, { status: 400 });
    }

    const laporan = await prisma.laporanMingguan.findUnique({ where: { idLaporan } });
    if (!laporan) {
      return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    await prisma.laporanMingguan.delete({ where: { idLaporan } });
    return NextResponse.json({ success: true, message: 'Laporan dihapus.' });
  } catch (error) {
    console.error('API Laporan DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
