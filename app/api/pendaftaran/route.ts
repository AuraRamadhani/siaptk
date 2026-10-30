import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pendaftaran -> daftar calon siswa (penetapan penerimaan oleh kepala sekolah)
export async function GET() {
  try {
    const data = await prisma.anak.findMany({
      where: { status: 'PENDAFTAR' },
      orderBy: { nama: 'asc' },
      include: { keluarga: true, berkasAnak: true },
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Pendaftaran GET Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/pendaftaran -> penetapan penerimaan (terima = AKTIF, batal = PENDAFTAR)
export async function PATCH(request: Request) {
  try {
    const { idAnak, aksi } = await request.json();
    if (!idAnak || !['terima', 'batal'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idAnak dan aksi (terima/batal) wajib diisi.' }, { status: 400 });
    }

    const anak = await prisma.anak.update({
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
      data: anak,
      message: aksi === 'terima' ? 'Siswa ditetapkan sebagai siswa aktif.' : 'Penetapan dibatalkan.',
    });
  } catch (error: any) {
    console.error('API Pendaftaran PATCH Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Kesalahan server.' }, { status: 500 });
  }
}