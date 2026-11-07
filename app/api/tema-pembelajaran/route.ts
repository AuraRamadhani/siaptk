import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

const BOLEH = ['GURU', 'KEPALA_SEKOLAH'];

// GET /api/tema-pembelajaran -> list tema (urut minggu)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const data = await prisma.temaPembelajaran.findMany({ orderBy: { mingguKe: 'asc' } });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Tema GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/tema-pembelajaran -> tambah tema
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { namaTema, mingguKe } = await request.json();
    if (!namaTema || !mingguKe) {
      return NextResponse.json({ success: false, error: 'Nama tema dan minggu ke wajib diisi.' }, { status: 400 });
    }
    if (Number(mingguKe) < 1 || Number(mingguKe) > 52) {
      return NextResponse.json({ success: false, error: 'Minggu ke harus 1-52.' }, { status: 400 });
    }

    const tema = await prisma.temaPembelajaran.create({
      data: { namaTema: String(namaTema).trim(), mingguKe: Number(mingguKe) },
    });

    return NextResponse.json({ success: true, data: tema, message: 'Tema ditambahkan.' });
  } catch (error) {
    console.error('API Tema POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/tema-pembelajaran -> edit tema
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { idTema, namaTema, mingguKe } = await request.json();
    if (!idTema) {
      return NextResponse.json({ success: false, error: 'idTema wajib diisi.' }, { status: 400 });
    }

    const updated = await prisma.temaPembelajaran.update({
      where: { idTema },
      data: {
        namaTema: namaTema ? String(namaTema).trim() : undefined,
        mingguKe: mingguKe ? Number(mingguKe) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Tema diperbarui.' });
  } catch (error) {
    console.error('API Tema PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/tema-pembelajaran?idTema=...
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idTema = searchParams.get('idTema');
    if (!idTema) {
      return NextResponse.json({ success: false, error: 'idTema wajib diisi.' }, { status: 400 });
    }

    const dipakai = await prisma.laporanMingguan.count({ where: { idTema } });
    if (dipakai > 0) {
      return NextResponse.json(
        { success: false, error: `Tema dipakai ${dipakai} laporan, tidak dapat dihapus.` },
        { status: 409 }
      );
    }

    await prisma.temaPembelajaran.delete({ where: { idTema } });
    return NextResponse.json({ success: true, message: 'Tema dihapus.' });
  } catch (error) {
    console.error('API Tema DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
