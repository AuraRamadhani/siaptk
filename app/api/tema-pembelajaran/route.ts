import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { randomUUID } from 'crypto';

const BOLEH = ['GURU', 'KEPALA_SEKOLAH'];

// GET /api/tema-pembelajaran -> list tema (urut minggu)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const rows: any = await prisma.$queryRawUnsafe(
      'SELECT `id_tema` as idTema, `nama_tema` as namaTema, `minggu_ke` as mingguKe, `periode`, `subtema_harian` as subtemaHarian FROM `tema_pembelajaran` ORDER BY `minggu_ke` ASC'
    );
    const data = (rows || []).map((r: any) => ({
      idTema: r.idTema,
      namaTema: r.namaTema,
      mingguKe: Number(r.mingguKe),
      periode: r.periode || null,
      subtemaHarian: r.subtemaHarian || null,
    }));

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

    const { namaTema, mingguKe, periode, subtemaHarian } = await request.json();
    if (!namaTema || !mingguKe) {
      return NextResponse.json({ success: false, error: 'Nama tema dan minggu ke wajib diisi.' }, { status: 400 });
    }
    const mKe = Number(mingguKe);
    if (mKe < 1 || mKe > 52) {
      return NextResponse.json({ success: false, error: 'Minggu ke harus 1-52.' }, { status: 400 });
    }

    const idTema = randomUUID();
    const namaFinal = String(namaTema).trim();
    const periodeFinal = periode ? String(periode).trim() : null;
    const subtemaFinal = subtemaHarian
      ? typeof subtemaHarian === 'string'
        ? subtemaHarian
        : JSON.stringify(subtemaHarian)
      : null;

    await prisma.$executeRawUnsafe(
      'INSERT INTO `tema_pembelajaran` (`id_tema`, `nama_tema`, `minggu_ke`, `periode`, `subtema_harian`) VALUES (?, ?, ?, ?, ?)',
      idTema,
      namaFinal,
      mKe,
      periodeFinal,
      subtemaFinal
    );

    return NextResponse.json({
      success: true,
      data: { idTema, namaTema: namaFinal, mingguKe: mKe, periode: periodeFinal, subtemaHarian: subtemaFinal },
      message: 'Tema ditambahkan.',
    });
  } catch (error: any) {
    console.error('API Tema POST Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/tema-pembelajaran -> edit tema
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !BOLEH.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { idTema, namaTema, mingguKe, periode, subtemaHarian } = await request.json();
    if (!idTema) {
      return NextResponse.json({ success: false, error: 'idTema wajib diisi.' }, { status: 400 });
    }

    const namaFinal = namaTema ? String(namaTema).trim() : 'Tema Pembelajaran';
    const mingguFinal = mingguKe !== undefined ? Number(mingguKe) : 1;
    const periodeFinal = periode ? String(periode).trim() : null;
    const subtemaFinal = subtemaHarian !== undefined
      ? (subtemaHarian ? (typeof subtemaHarian === 'string' ? subtemaHarian : JSON.stringify(subtemaHarian)) : null)
      : null;

    // Cek apakah record dengan idTema atau mingguKe ada di database
    const rows: any = await prisma.$queryRawUnsafe(
      'SELECT `id_tema` as idTema FROM `tema_pembelajaran` WHERE `id_tema` = ? OR `minggu_ke` = ? LIMIT 1',
      idTema,
      mingguFinal
    );

    const targetId = rows?.[0]?.idTema || idTema;

    if (rows && rows.length > 0) {
      await prisma.$executeRawUnsafe(
        'UPDATE `tema_pembelajaran` SET `nama_tema` = ?, `minggu_ke` = ?, `periode` = ?, `subtema_harian` = ? WHERE `id_tema` = ?',
        namaFinal,
        mingguFinal,
        periodeFinal,
        subtemaFinal,
        targetId
      );
    } else {
      await prisma.$executeRawUnsafe(
        'INSERT INTO `tema_pembelajaran` (`id_tema`, `nama_tema`, `minggu_ke`, `periode`, `subtema_harian`) VALUES (?, ?, ?, ?, ?)',
        targetId,
        namaFinal,
        mingguFinal,
        periodeFinal,
        subtemaFinal
      );
    }

    return NextResponse.json({
      success: true,
      data: { idTema: targetId, namaTema: namaFinal, mingguKe: mingguFinal, periode: periodeFinal, subtemaHarian: subtemaFinal },
      message: 'Tema berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('API Tema PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Kesalahan server saat memperbarui tema.' },
      { status: 500 }
    );
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

    await prisma.$executeRawUnsafe('DELETE FROM `tema_pembelajaran` WHERE `id_tema` = ?', idTema);
    return NextResponse.json({ success: true, message: 'Tema dihapus.' });
  } catch (error) {
    console.error('API Tema DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
