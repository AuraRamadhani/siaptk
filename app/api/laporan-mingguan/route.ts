import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

function formatCatatan(catatan: string, foto?: string | null) {
  const c = String(catatan || '').trim();
  if (!foto) return c;
  return `${c}\n[FOTO_AKTIVITAS]:${foto}`;
}

export function parseCatatan(raw: string) {
  if (!raw) return { catatan: '', fotoAktivitas: null, detailLaporan: null };
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.versi === '2.0' || parsed.aspekPerkembangan || parsed.rekapHarian) {
        return {
          catatan: parsed.catatanPerkembangan || parsed.catatan || '',
          fotoAktivitas: parsed.fotoAktivitas || null,
          detailLaporan: parsed,
        };
      }
    } catch {
      // bukan JSON, lanjut ke parsing teks
    }
  }

  const marker = '\n[FOTO_AKTIVITAS]:';
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    return {
      catatan: raw.slice(0, idx).trim(),
      fotoAktivitas: raw.slice(idx + marker.length).trim(),
      detailLaporan: null,
    };
  }
  return { catatan: raw, fotoAktivitas: null, detailLaporan: null };
}

// GET /api/laporan-mingguan -> list laporan untuk guru & monitoring kepala sekolah
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['GURU', 'KEPALA_SEKOLAH', 'BENDAHARA', 'SUPER_ADMIN'].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Hanya staf yang dapat melihat laporan.' }, { status: 403 });
    }

    const tahunAktif = await prisma.tahunAjaran.findFirst({ where: { statusAktif: true } });
    if (!tahunAktif) {
      return NextResponse.json({ success: false, error: 'Belum ada tahun ajaran aktif.' }, { status: 404 });
    }

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

    const data = laporan.map((l) => {
      const parsed = parseCatatan(l.catatanKegiatan);
      return {
        ...l,
        catatanKegiatan: parsed.catatan,
        fotoAktivitas: parsed.fotoAktivitas,
        detailLaporan: parsed.detailLaporan,
      };
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API Laporan GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/laporan-mingguan -> input laporan baru (mendukung format detail kurikulum PAUD & legacy)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'GURU') {
      return NextResponse.json({ success: false, error: 'Hanya guru yang dapat input laporan.' }, { status: 403 });
    }

    const body = await request.json();
    const { idAnak, idTema, aspek, catatanKegiatan, catatanPerAspek, fotoAktivitas, detailLaporan } = body;

    if (!idAnak || !idTema) {
      return NextResponse.json(
        { success: false, error: 'Siswa dan tema pembelajaran wajib dipilih.' },
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

    // FORMAT BARU: Laporan Terpadu 4 Bagian (Detail Lengkap Kurikulum PAUD)
    if (detailLaporan && typeof detailLaporan === 'object') {
      const jsonStr = JSON.stringify(detailLaporan);
      const created = await prisma.laporanMingguan.create({
        data: {
          idAnak,
          idTema,
          aspek: 'EVALUASI_TERPADU',
          catatanKegiatan: jsonStr,
        },
        include: { anak: true, tema: true },
      });

      return NextResponse.json({
        success: true,
        data: [created],
        message: 'Laporan mingguan terpadu berhasil disimpan.',
      });
    }

    // FALLBACK / LEGACY: Format multi-aspek sederhana
    const validAspek = ['SOSIAL', 'KOGNITIF', 'MOTORIK', 'EMOSI'];
    const itemsToCreate: { aspek: string; catatan: string }[] = [];

    if (catatanPerAspek && typeof catatanPerAspek === 'object') {
      for (const asp of validAspek) {
        const isi = catatanPerAspek[asp];
        if (isi && String(isi).trim()) {
          itemsToCreate.push({
            aspek: asp,
            catatan: formatCatatan(String(isi).trim(), fotoAktivitas),
          });
        }
      }
    } else if (aspek && catatanKegiatan) {
      if (!validAspek.includes(String(aspek).toUpperCase())) {
        return NextResponse.json(
          { success: false, error: `Aspek harus: ${validAspek.join(', ')}` },
          { status: 400 }
        );
      }
      itemsToCreate.push({
        aspek: String(aspek).toUpperCase(),
        catatan: formatCatatan(String(catatanKegiatan).trim(), fotoAktivitas),
      });
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Setidaknya satu catatan aspek perkembangan harus diisi.' },
        { status: 400 }
      );
    }

    const hasilList = [];
    for (const item of itemsToCreate) {
      const lap = await prisma.laporanMingguan.create({
        data: {
          idAnak,
          idTema,
          aspek: item.aspek,
          catatanKegiatan: item.catatan,
        },
        include: { anak: true, tema: true },
      });
      hasilList.push(lap);
    }

    return NextResponse.json({
      success: true,
      data: hasilList,
      message: `${hasilList.length} laporan aspek perkembangan berhasil disimpan.`,
    });
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

    const { idLaporan, idTema, aspek, catatanKegiatan, fotoAktivitas, detailLaporan } = await request.json();
    if (!idLaporan) {
      return NextResponse.json({ success: false, error: 'idLaporan wajib diisi.' }, { status: 400 });
    }

    const laporan = await prisma.laporanMingguan.findUnique({ where: { idLaporan } });
    if (!laporan) {
      return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    if (idTema) {
      const tema = await prisma.temaPembelajaran.findUnique({ where: { idTema } });
      if (!tema) {
        return NextResponse.json({ success: false, error: 'Tema tidak ditemukan.' }, { status: 404 });
      }
    }

    // FORMAT BARU: Update format detail terpadu
    if (detailLaporan && typeof detailLaporan === 'object') {
      const jsonStr = JSON.stringify(detailLaporan);
      const updated = await prisma.laporanMingguan.update({
        where: { idLaporan },
        data: {
          idTema: idTema ? String(idTema) : undefined,
          aspek: 'EVALUASI_TERPADU',
          catatanKegiatan: jsonStr,
        },
        include: { anak: true, tema: true },
      });

      const parsedUpdated = parseCatatan(updated.catatanKegiatan);

      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          catatanKegiatan: parsedUpdated.catatan,
          fotoAktivitas: parsedUpdated.fotoAktivitas,
          detailLaporan: parsedUpdated.detailLaporan,
        },
        message: 'Laporan perkembangan berhasil diperbarui.',
      });
    }

    // LEGACY UPDATE
    const existingParsed = parseCatatan(laporan.catatanKegiatan);
    const teksCatatan = catatanKegiatan !== undefined ? String(catatanKegiatan).trim() : existingParsed.catatan;
    const finalFoto = fotoAktivitas !== undefined ? fotoAktivitas : existingParsed.fotoAktivitas;

    const updated = await prisma.laporanMingguan.update({
      where: { idLaporan },
      data: {
        idTema: idTema ? String(idTema) : undefined,
        aspek: aspek ? String(aspek).toUpperCase() : undefined,
        catatanKegiatan: formatCatatan(teksCatatan, finalFoto),
      },
      include: { anak: true, tema: true },
    });

    const parsedUpdated = parseCatatan(updated.catatanKegiatan);

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        catatanKegiatan: parsedUpdated.catatan,
        fotoAktivitas: parsedUpdated.fotoAktivitas,
        detailLaporan: parsedUpdated.detailLaporan,
      },
      message: 'Laporan berhasil diperbarui.',
    });
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
