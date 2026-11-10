import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashSandi } from '@/lib/sandi';
import type { Peran } from '@/lib/sesi';

const PERAN_VALID: Peran[] = ['ORANG_TUA', 'GURU', 'BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN'];

const normHp = (hp: string) => hp.replace(/\D/g, '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      peran = 'ORANG_TUA',
      email,
      verifikasi,
      aksi = 'reset',
      kataSandiBaru,
    } = body as {
      peran?: Peran;
      email?: string;
      verifikasi?: string;
      aksi?: 'cek' | 'reset';
      kataSandiBaru?: string;
    };

    if (!PERAN_VALID.includes(peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak dikenal.' }, { status: 400 });
    }

    const surel = String(email || '').toLowerCase().trim();
    const verif = String(verifikasi || '').trim();

    if (!surel || !verif) {
      return NextResponse.json(
        {
          success: false,
          error:
            peran === 'ORANG_TUA'
              ? 'Email dan nomor WhatsApp terdaftar wajib diisi.'
              : 'Email dan nama lengkap terdaftar wajib diisi.',
        },
        { status: 400 }
      );
    }

    if (peran === 'ORANG_TUA') {
      const keluarga = await prisma.keluarga.findUnique({ where: { email: surel } });
      const cocokHp =
        keluarga &&
        (keluarga.noHp.trim() === verif ||
          (normHp(keluarga.noHp).length >= 6 && normHp(keluarga.noHp) === normHp(verif)));

      if (!keluarga || !cocokHp) {
        return NextResponse.json(
          { success: false, error: 'Email atau nomor WhatsApp tidak cocok dengan data terdaftar.' },
          { status: 404 }
        );
      }

      if (aksi === 'cek') {
        return NextResponse.json({
          success: true,
          data: { nama: keluarga.namaAyah || keluarga.namaIbu || 'Orang Tua' },
          message: 'Akun terverifikasi. Silakan buat kata sandi baru.',
        });
      }

      if (!kataSandiBaru || kataSandiBaru.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi baru minimal 6 karakter.' },
          { status: 400 }
        );
      }

      await prisma.keluarga.update({
        where: { idKeluarga: keluarga.idKeluarga },
        data: { kataSandi: hashSandi(kataSandiBaru) },
      });

      return NextResponse.json({
        success: true,
        message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.',
      });
    }

    // Peran staf (GURU, BENDAHARA, KEPALA_SEKOLAH)
    const akun = await prisma.akunStaf.findUnique({ where: { email: surel } });
    const cocokNama = akun && akun.aktif && akun.peran === peran && akun.nama.trim().toLowerCase() === verif.toLowerCase();

    if (!akun || !cocokNama) {
      return NextResponse.json(
        { success: false, error: 'Email atau nama lengkap staf tidak cocok.' },
        { status: 404 }
      );
    }

    if (aksi === 'cek') {
      return NextResponse.json({
        success: true,
        data: { nama: akun.nama },
        message: 'Akun terverifikasi. Silakan buat kata sandi baru.',
      });
    }

    if (!kataSandiBaru || kataSandiBaru.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi baru minimal 6 karakter.' },
        { status: 400 }
      );
    }

    await prisma.akunStaf.update({
      where: { idAkun: akun.idAkun },
      data: { kataSandi: hashSandi(kataSandiBaru) },
    });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.',
    });
  } catch (error) {
    console.error('API Reset Password Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

