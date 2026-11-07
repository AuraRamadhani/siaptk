import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cekSandi } from '@/lib/sandi';
import { buatToken, NAMA_KUKI, opsiKuki, type Peran } from '@/lib/sesi';

const PERAN_VALID: Peran[] = ['ORANG_TUA', 'GURU', 'BENDAHARA', 'KEPALA_SEKOLAH'];

export async function POST(request: Request) {
  try {
    const { peran, email, kataSandi } = (await request.json()) as {
      peran?: Peran;
      email?: string;
      kataSandi?: string;
    };

    if (!peran || !PERAN_VALID.includes(peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak dikenal.' }, { status: 400 });
    }
    if (!email || !kataSandi) {
      return NextResponse.json({ success: false, error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const surel = email.toLowerCase().trim();

    if (peran === 'ORANG_TUA') {
      const keluarga = await prisma.keluarga.findUnique({ where: { email: surel } });

      if (!keluarga || !cekSandi(kataSandi, keluarga.kataSandi)) {
        return NextResponse.json({ success: false, error: 'Email atau kata sandi salah.' }, { status: 401 });
      }

      const res = NextResponse.json({
        success: true,
        peran,
        nama: keluarga.namaAyah || keluarga.namaIbu || 'Orang Tua',
      });
      res.cookies.set(NAMA_KUKI, buatToken({ id: keluarga.idKeluarga, nama: keluarga.namaAyah || 'Orang Tua', peran }), opsiKuki);
      return res;
    }

    const akun = await prisma.akunStaf.findUnique({ where: { email: surel } });

    if (!akun || !akun.aktif || akun.peran !== peran || !cekSandi(kataSandi, akun.kataSandi)) {
      return NextResponse.json({ success: false, error: 'Email atau kata sandi salah.' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, peran, nama: akun.nama });
    res.cookies.set(NAMA_KUKI, buatToken({ id: akun.idAkun, nama: akun.nama, peran }), opsiKuki);
    return res;
  } catch (error: unknown) {
    console.error('API login error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}