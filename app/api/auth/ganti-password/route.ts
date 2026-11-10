import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { cekSandi, hashSandi } from '@/lib/sandi';

export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const { kataSandiLama, kataSandiBaru } = (await request.json()) as {
      kataSandiLama?: string;
      kataSandiBaru?: string;
    };

    if (!kataSandiLama || !kataSandiBaru) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi lama dan kata sandi baru wajib diisi.' },
        { status: 400 }
      );
    }

    if (kataSandiBaru.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi baru minimal 6 karakter.' },
        { status: 400 }
      );
    }

    if (sesi.peran === 'ORANG_TUA') {
      const keluarga = await prisma.keluarga.findUnique({ where: { idKeluarga: sesi.id } });
      if (!keluarga || !cekSandi(kataSandiLama, keluarga.kataSandi)) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi lama tidak sesuai.' },
          { status: 401 }
        );
      }

      await prisma.keluarga.update({
        where: { idKeluarga: sesi.id },
        data: { kataSandi: hashSandi(kataSandiBaru) },
      });

      return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
    }

    const akun = await prisma.akunStaf.findUnique({ where: { idAkun: sesi.id } });
    if (!akun || !cekSandi(kataSandiLama, akun.kataSandi)) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi lama tidak sesuai.' },
        { status: 401 }
      );
    }

    await prisma.akunStaf.update({
      where: { idAkun: sesi.id },
      data: { kataSandi: hashSandi(kataSandiBaru) },
    });

    return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (error) {
    console.error('API Ganti Password Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

