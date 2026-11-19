import { NextResponse } from 'next/server';
import { sesiSekarang } from '@/lib/sesi';
import { ambilDaftarAlumni, luluskanSiswaKeDatabaseAlumni } from '@/lib/dbAlumni';
import { prisma } from '@/lib/prisma';

// GET /api/alumni -> Daftar alumni dari Database 2 (alumni_siaptk)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Akses khusus Kepala Sekolah.' },
        { status: 403 }
      );
    }

    const [alumni, siswaAktif] = await Promise.all([
      ambilDaftarAlumni(),
      prisma.anak.findMany({
        where: { status: 'AKTIF' },
        include: {
          keluarga: { select: { namaAyah: true, namaIbu: true, noHp: true } },
          riwayatKelompok: {
            include: { kelompok: true },
            take: 1,
          },
        },
        orderBy: { nama: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      database: 'alumni_siaptk',
      data: alumni,
      siswaAktif,
    });
  } catch (err: unknown) {
    console.error('API Alumni GET Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Kesalahan server.' },
      { status: 500 }
    );
  }
}

// POST /api/alumni -> Luluskan siswa & simpan ke Database 2 (alumni_siaptk)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json(
        { success: false, error: 'Hanya Kepala Sekolah yang berwenang menetapkan kelulusan siswa.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { idAnak, tahunLulus, catatan } = body;

    if (!idAnak || !tahunLulus) {
      return NextResponse.json(
        { success: false, error: 'idAnak dan tahunLulus wajib diisi.' },
        { status: 400 }
      );
    }

    const hasil = await luluskanSiswaKeDatabaseAlumni({
      idAnak,
      tahunLulus: String(tahunLulus).trim(),
      catatan: catatan ? String(catatan).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Siswa berhasil diluluskan dan data disimpan ke Database 2 (alumni_siaptk).`,
      data: hasil,
    });
  } catch (err: unknown) {
    console.error('API Alumni POST Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Kesalahan server.' },
      { status: 500 }
    );
  }
}
