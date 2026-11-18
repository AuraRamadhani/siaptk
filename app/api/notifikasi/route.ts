import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    if (sesi.peran !== 'ORANG_TUA') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const notifikasi = await prisma.notifikasi.findMany({
      where: { idKeluarga: sesi.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: notifikasi });
  } catch (error) {
    console.error('API Notifikasi GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    if (sesi.peran !== 'ORANG_TUA') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { idNotifikasi, semua } = await request.json();

    if (semua) {
      await prisma.notifikasi.updateMany({
        where: { idKeluarga: sesi.id, dibaca: false },
        data: { dibaca: true },
      });
      return NextResponse.json({ success: true, message: 'Semua notifikasi ditandai dibaca.' });
    }

    if (!idNotifikasi) {
      return NextResponse.json({ success: false, error: 'idNotifikasi wajib diisi.' }, { status: 400 });
    }

    const notif = await prisma.notifikasi.findUnique({ where: { idNotifikasi } });
    if (!notif || notif.idKeluarga !== sesi.id) {
      return NextResponse.json({ success: false, error: 'Notifikasi tidak ditemukan.' }, { status: 404 });
    }

    await prisma.notifikasi.update({
      where: { idNotifikasi },
      data: { dibaca: true },
    });

    return NextResponse.json({ success: true, message: 'Notifikasi ditandai dibaca.' });
  } catch (error) {
    console.error('API Notifikasi PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}