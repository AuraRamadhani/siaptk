import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { TANGGAL_ACUAN_PPDB, tentukanKelompokDariTglLahir, USIA_MIN, USIA_MAX } from '@/lib/usia';
import { acuanTahunAjaran, rencanaKenaikan } from '@/lib/kenaikan';

// GET /api/pengelompokan -> daftar kelompok + isi siswa tahun ajaran aktif
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['KEPALA_SEKOLAH', 'GURU', 'BENDAHARA', 'SUPER_ADMIN'].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const tahunAktif = await prisma.tahunAjaran.findFirst({ where: { statusAktif: true } });
    if (!tahunAktif) {
      return NextResponse.json({ success: false, error: 'Belum ada tahun ajaran aktif.' }, { status: 404 });
    }

    const kelompok = await prisma.kelompok.findMany({
      orderBy: { usiaMin: 'asc' },
      include: {
        riwayatKelompok: {
          where: { idTahunAjaran: tahunAktif.idTahunAjaran },
          include: {
            anak: { include: { keluarga: { select: { namaAyah: true, namaIbu: true } } } },
          },
        },
      },
    });

    const belumKelompok = await prisma.anak.findMany({
      where: {
        riwayatKelompok: { none: { idTahunAjaran: tahunAktif.idTahunAjaran } },
      },
      include: { keluarga: { select: { namaAyah: true, namaIbu: true } } },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: { tahunAjaran: tahunAktif, kelompok, belumKelompok },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API Pengelompokan GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/pengelompokan?idRiwayat=... -> batalkan pengelompokan (KEPALA_SEKOLAH)
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idRiwayat = searchParams.get('idRiwayat');
    if (!idRiwayat) {
      return NextResponse.json({ success: false, error: 'idRiwayat wajib diisi.' }, { status: 400 });
    }

    const riwayat = await prisma.riwayatKelompok.findUnique({
      where: { idRiwayat },
      include: { anak: true },
    });
    if (!riwayat) {
      return NextResponse.json({ success: false, error: 'Riwayat tidak ditemukan.' }, { status: 404 });
    }

    await prisma.riwayatKelompok.delete({ where: { idRiwayat } });
    return NextResponse.json({
      success: true,
      message: `${riwayat.anak.nama} dikeluarkan dari kelompok.`,
    });
  } catch (error) {
    console.error('API Pengelompokan DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/pengelompokan -> jalankan pengelompokan otomatis (KEPALA_SEKOLAH only)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat menjalankan pengelompokan.' },
        { status: 403 }
      );
    }

    // ?terapkan=1 menyimpan hasil; tanpa itu hanya pratinjau.
    const terapkan = new URL(request.url).searchParams.get('terapkan') === '1';

    const tahunAktif = await prisma.tahunAjaran.findFirst({ where: { statusAktif: true } });
    if (!tahunAktif) {
      return NextResponse.json({ success: false, error: 'Belum ada tahun ajaran aktif.' }, { status: 404 });
    }

    const kelompok = await prisma.kelompok.findMany({ orderBy: { usiaMin: 'asc' } });
    if (kelompok.length === 0) {
      return NextResponse.json({ success: false, error: 'Belum ada data kelompok.' }, { status: 404 });
    }

    // Usia dihitung memakai acuan tahun ajaran aktif, bukan konstanta 1 Juli 2026.
    const acuan = acuanTahunAjaran(tahunAktif, TANGGAL_ACUAN_PPDB);

    const rencana = await rencanaKenaikan(prisma, {
      idTahunAjaran: tahunAktif.idTahunAjaran,
      acuan,
      usiaMin: USIA_MIN,
      usiaMaks: USIA_MAX,
      kelompok,
      tentukan: tentukanKelompokDariTglLahir,
    });

    const naik = rencana.filter((b) => b.hasil === 'NAIK');
    const lulus = rencana.filter((b) => b.hasil === 'LULUS');
    const gagal = rencana.filter((b) => b.hasil === 'GAGAL');
    const tetap = rencana.filter((b) => b.hasil === 'TETAP');

    const ringkasan = {
      tahunAjaran: tahunAktif.periode,
      acuan: acuan.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      naik: naik.length,
      lulus: lulus.length,
      gagal: gagal.length,
      tetap: tetap.length,
      rincian: rencana,
    };

    // Pratinjau: tidak ada yang diubah.
    if (!terapkan) {
      return NextResponse.json({
        success: true,
        data: ringkasan,
        message:
          `${naik.length} siswa naik kelompok, ${lulus.length} lulus, ` +
          `${tetap.length} tetap, ${gagal.length} tidak dapat diproses.`,
      });
    }

    // Terapkan: simpan kelompok baru, dan tandai lulus bagi yang melewati batas usia.
    let disimpan = 0;
    for (const baris of rencana) {
      // Hanya baris yang punya kelompok tujuan yang bisa disimpan (NAIK dan TETAP).
      if (!baris.kelompokBaru) continue;
      const tujuan = kelompok.find((k) => k.nama === baris.kelompokBaru);
      if (!tujuan) continue;
      // Baris TETAP yang sudah punya kelompok tahun ini tidak perlu ditulis ulang.
      if (baris.alasan === 'Sudah dikelompokkan pada tahun ajaran ini') continue;
      await prisma.riwayatKelompok.create({
        data: {
          idAnak: baris.idAnak,
          idKelompok: tujuan.idKelompok,
          idTahunAjaran: tahunAktif.idTahunAjaran,
        },
      });
      disimpan += 1;
    }

    for (const baris of lulus) {
      await prisma.anak.update({
        where: { idAnak: baris.idAnak },
        data: { status: 'LULUS' },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...ringkasan, disimpan },
      message:
        `${disimpan} siswa dikelompokkan, ${lulus.length} ditandai lulus, ` +
        `${gagal.length} tidak dapat diproses.`,
    });
  } catch (error) {
    console.error('API Pengelompokan POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
