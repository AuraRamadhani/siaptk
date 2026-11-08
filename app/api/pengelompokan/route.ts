import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { hitungUsia, USIA_MIN, USIA_MAX } from '@/lib/usia';

// GET /api/pengelompokan -> daftar kelompok + isi siswa tahun ajaran aktif
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['KEPALA_SEKOLAH', 'GURU'].includes(sesi.peran)) {
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
        status: 'AKTIF',
        riwayatKelompok: { none: { idTahunAjaran: tahunAktif.idTahunAjaran } },
      },
      include: { keluarga: { select: { namaAyah: true, namaIbu: true } } },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { tahunAjaran: tahunAktif, kelompok, belumKelompok },
    });
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
export async function POST() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat menjalankan pengelompokan.' },
        { status: 403 }
      );
    }

    const tahunAktif = await prisma.tahunAjaran.findFirst({ where: { statusAktif: true } });
    if (!tahunAktif) {
      return NextResponse.json({ success: false, error: 'Belum ada tahun ajaran aktif.' }, { status: 404 });
    }

    const kelompok = await prisma.kelompok.findMany({ orderBy: { usiaMin: 'asc' } });
    if (kelompok.length === 0) {
      return NextResponse.json({ success: false, error: 'Belum ada data kelompok.' }, { status: 404 });
    }

    const siswa = await prisma.anak.findMany({
      where: {
        status: 'AKTIF',
        riwayatKelompok: { none: { idTahunAjaran: tahunAktif.idTahunAjaran } },
      },
    });

    const berhasil: { nama: string; kelompok: string; usia: number }[] = [];
    const gagal: { nama: string; alasan: string }[] = [];

    for (const anak of siswa) {
      const usia = hitungUsia(new Date(anak.tglLahir));

      if (usia < USIA_MIN) {
        gagal.push({ nama: anak.nama, alasan: `Usia ${usia} tahun, minimal ${USIA_MIN} tahun.` });
        continue;
      }
      if (usia > USIA_MAX) {
        gagal.push({ nama: anak.nama, alasan: `Usia ${usia} tahun, maksimal ${USIA_MAX} tahun.` });
        continue;
      }

      const cocok = kelompok.find((k) => usia >= k.usiaMin && usia <= k.usiaMaks);
      if (!cocok) {
        gagal.push({ nama: anak.nama, alasan: `Tidak ada kelompok untuk usia ${usia} tahun.` });
        continue;
      }

      await prisma.riwayatKelompok.create({
        data: {
          idAnak: anak.idAnak,
          idKelompok: cocok.idKelompok,
          idTahunAjaran: tahunAktif.idTahunAjaran,
        },
      });
      berhasil.push({ nama: anak.nama, kelompok: cocok.nama, usia });
    }

    return NextResponse.json({
      success: true,
      data: { berhasil, gagal },
      message: `${berhasil.length} siswa dikelompokkan, ${gagal.length} gagal.`,
    });
  } catch (error) {
    console.error('API Pengelompokan POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
