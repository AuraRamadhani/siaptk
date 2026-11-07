import { NextResponse } from 'next/server';
import { prisma, KELUARGA_AMAN } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

const KEPALA = 'KEPALA_SEKOLAH';

// GET /api/pendaftaran -> daftar calon siswa (penetapan penerimaan oleh kepala sekolah)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== KEPALA) {
      return NextResponse.json({ success: false, error: 'Hanya kepala sekolah yang dapat melihat daftar calon siswa.' }, { status: 403 });
    }

    const data = await prisma.anak.findMany({
      where: { status: 'PENDAFTAR' },
      orderBy: { nama: 'asc' },
      include: { keluarga: { select: KELUARGA_AMAN }, berkasAnak: true },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Pendaftaran GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/pendaftaran -> penetapan penerimaan (terima = AKTIF, batal = PENDAFTAR)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== KEPALA) {
      return NextResponse.json({ success: false, error: 'Hanya kepala sekolah yang dapat memutuskan penerimaan.' }, { status: 403 });
    }

    const { idAnak, aksi } = await request.json();
    if (!idAnak || !['terima', 'batal'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idAnak dan aksi (terima/batal) wajib diisi.' }, { status: 400 });
    }

    const anak = await prisma.anak.findUnique({ where: { idAnak } });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Calon siswa tidak ditemukan.' }, { status: 404 });
    }

    const updated = await prisma.anak.update({
      where: { idAnak },
      data: { status: aksi === 'terima' ? 'AKTIF' : 'PENDAFTAR' },
    });

    // Rekening tabungan disiapkan saat siswa resmi diterima
    if (aksi === 'terima') {
      await prisma.rekeningTabungan.upsert({
        where: { idAnak },
        update: {},
        create: { idAnak, saldo: 0 },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: aksi === 'terima' ? 'Siswa ditetapkan sebagai siswa aktif.' : 'Penetapan dibatalkan.',
    });
  } catch (error) {
    console.error('API Pendaftaran PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}