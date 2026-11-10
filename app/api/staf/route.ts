import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { hashSandi } from '@/lib/sandi';
import type { PeranStaf } from '@/app/generated/prisma/client';

const PERAN_STAF_KELOLA: PeranStaf[] = ['GURU', 'BENDAHARA', 'KEPALA_SEKOLAH'];

// GET /api/staf -> daftar semua akun staf (SUPER_ADMIN only)
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mengelola akun staf.' },
        { status: 403 }
      );
    }

    const daftar = await prisma.akunStaf.findMany({
      where: { peran: { in: PERAN_STAF_KELOLA } },
      orderBy: [{ peran: 'asc' }, { createdAt: 'desc' }],
      select: {
        idAkun: true,
        nama: true,
        email: true,
        peran: true,
        aktif: true,
        createdAt: true,
      },
    });

    const ringkasanPeran = PERAN_STAF_KELOLA.map((peran) => {
      const akunPeran = daftar.filter((d) => d.peran === peran);
      const aktifCount = akunPeran.filter((d) => d.aktif).length;
      return {
        peran,
        total: akunPeran.length,
        aktif: aktifCount,
        sudahAda: aktifCount > 0,
      };
    });

    return NextResponse.json({ success: true, data: daftar, ringkasanPeran });
  } catch (error) {
    console.error('API Staf GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/staf -> buat akun staf baru (GURU, BENDAHARA, KEPALA_SEKOLAH)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat membuat akun staf.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const nama = String(body.nama || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const kataSandi = String(body.kataSandi || '');
    const peran = String(body.peran || '') as PeranStaf;

    if (!nama || !email || !kataSandi || !peran) {
      return NextResponse.json(
        { success: false, error: 'Nama, email, peran, dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    if (!PERAN_STAF_KELOLA.includes(peran)) {
      return NextResponse.json(
        { success: false, error: 'Peran harus GURU, BENDAHARA, atau KEPALA_SEKOLAH.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Format email tidak valid.' }, { status: 400 });
    }

    if (kataSandi.length < 6) {
      return NextResponse.json({ success: false, error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    const ada = await prisma.akunStaf.findUnique({ where: { email } });
    if (ada) {
      return NextResponse.json(
        { success: false, error: 'Email tersebut sudah terdaftar pada akun staf.' },
        { status: 409 }
      );
    }

    const baru = await prisma.akunStaf.create({
      data: {
        nama,
        email,
        kataSandi: hashSandi(kataSandi),
        peran,
        aktif: true,
      },
      select: {
        idAkun: true,
        nama: true,
        email: true,
        peran: true,
        aktif: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: baru, message: `Akun ${peran.replace('_', ' ')} atas nama ${nama} berhasil dibuat.` },
      { status: 201 }
    );
  } catch (error) {
    console.error('API Staf POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/staf -> ubah status aktif, nama, peran, atau reset kata sandi staf
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mengubah akun staf.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { idAkun, nama, peran, aktif, kataSandiBaru } = body as {
      idAkun?: string;
      nama?: string;
      peran?: PeranStaf;
      aktif?: boolean;
      kataSandiBaru?: string;
    };

    if (!idAkun) {
      return NextResponse.json({ success: false, error: 'idAkun wajib diisi.' }, { status: 400 });
    }

    const target = await prisma.akunStaf.findUnique({ where: { idAkun } });
    if (!target || target.peran === 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akun staf tidak ditemukan.' }, { status: 404 });
    }

    if (peran && !PERAN_STAF_KELOLA.includes(peran)) {
      return NextResponse.json(
        { success: false, error: 'Peran harus GURU, BENDAHARA, atau KEPALA_SEKOLAH.' },
        { status: 400 }
      );
    }

    if (kataSandiBaru !== undefined && kataSandiBaru.length < 6) {
      return NextResponse.json({ success: false, error: 'Kata sandi baru minimal 6 karakter.' }, { status: 400 });
    }

    const updated = await prisma.akunStaf.update({
      where: { idAkun },
      data: {
        nama: nama ? nama.trim() : undefined,
        peran: peran || undefined,
        aktif: typeof aktif === 'boolean' ? aktif : undefined,
        kataSandi: kataSandiBaru ? hashSandi(kataSandiBaru) : undefined,
      },
      select: {
        idAkun: true,
        nama: true,
        email: true,
        peran: true,
        aktif: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Data akun staf diperbarui.' });
  } catch (error) {
    console.error('API Staf PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// DELETE /api/staf?idAkun=... -> hapus akun staf
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat menghapus akun staf.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idAkun = searchParams.get('idAkun');
    if (!idAkun) {
      return NextResponse.json({ success: false, error: 'idAkun wajib diisi.' }, { status: 400 });
    }

    const target = await prisma.akunStaf.findUnique({ where: { idAkun } });
    if (!target || target.peran === 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Akun staf tidak ditemukan.' }, { status: 404 });
    }

    await prisma.akunStaf.delete({ where: { idAkun } });
    return NextResponse.json({ success: true, message: `Akun ${target.nama} berhasil dihapus.` });
  } catch (error) {
    console.error('API Staf DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

