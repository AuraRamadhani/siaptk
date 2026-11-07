import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

const STAF = ['KEPALA_SEKOLAH', 'BENDAHARA', 'GURU'];

// GET /api/arsip?cari=...&tahunAjaran=...&status=...
// Pencarian arsip siswa berdasarkan nama, NIK, tahun ajaran.
export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !STAF.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cari = searchParams.get('cari')?.trim();
    const tahunAjaran = searchParams.get('tahunAjaran');
    const status = searchParams.get('status');

    const where: any = {};

    if (cari) {
      where.OR = [
        { nama: { contains: cari } },
        { nik: { contains: cari } },
        { keluarga: { namaAyah: { contains: cari } } },
        { keluarga: { namaIbu: { contains: cari } } },
      ];
    }

    if (status && ['AKTIF', 'PENDAFTAR'].includes(status)) {
      where.status = status;
    }

    if (tahunAjaran) {
      where.riwayatKelompok = { some: { idTahunAjaran: tahunAjaran } };
    }

    const data = await prisma.anak.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        keluarga: true,
        berkasAnak: true,
        riwayatKelompok: {
          include: { kelompok: true, tahunAjaran: true },
          orderBy: { tahunAjaran: { periode: 'desc' } },
        },
      },
    });

    const tahunAjaranList = await prisma.tahunAjaran.findMany({ orderBy: { periode: 'desc' } });

    return NextResponse.json({ success: true, data, tahunAjaranList });
  } catch (error: any) {
    console.error('API Arsip GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/arsip -> verifikasi berkas anak/keluarga (KEPALA_SEKOLAH only)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { tipe, id, status } = await request.json();
    const valid = ['MENUNGGU', 'DIVERIFIKASI', 'DITOLAK'];
    if (!tipe || !id || !valid.includes(status)) {
      return NextResponse.json(
        { success: false, error: `tipe (anak|keluarga), id, dan status (${valid.join('|')}) wajib diisi.` },
        { status: 400 }
      );
    }

    if (tipe === 'anak') {
      await prisma.berkasAnak.update({ where: { idBerkasAnak: id }, data: { statusVerifikasi: status } });
    } else if (tipe === 'keluarga') {
      await prisma.berkasKeluarga.update({ where: { idBerkasKel: id }, data: { statusVerifikasi: status } });
    } else {
      return NextResponse.json({ success: false, error: 'tipe harus anak atau keluarga.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Status berkas diperbarui.' });
  } catch (error: any) {
    console.error('API Arsip PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
