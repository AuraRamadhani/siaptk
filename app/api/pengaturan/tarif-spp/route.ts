import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { ambilTarifSpp, simpanTarifSpp, generateSppSemuaSiswa, NAMA_BULAN } from '@/lib/tagihan';

const PETUGAS = new Set(['BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);

// GET: Ambil tarif SPP yang sedang aktif
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const tarif = await ambilTarifSpp(prisma);
    return NextResponse.json({
      success: true,
      data: {
        tarif,
        bulanSaatIni: new Date().getMonth() + 1,
        namaBulanSaatIni: NAMA_BULAN[new Date().getMonth() + 1],
      },
    });
  } catch (err) {
    console.error('Error get tarif spp:', err);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST: Ubah tarif SPP atau terbitkan SPP bulanan
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Hanya bendahara yang berwenang mengatur tarif SPP.' }, { status: 403 });
    }

    const body = await request.json();
    const { aksi = 'simpan', nominal, bulan } = body;

    if (aksi === 'simpan') {
      const nilai = Number(nominal);
      if (!Number.isFinite(nilai) || nilai <= 0) {
        return NextResponse.json({ success: false, error: 'Nominal tarif SPP harus lebih besar dari 0.' }, { status: 400 });
      }

      const tarifBaru = await simpanTarifSpp(prisma, nilai);
      return NextResponse.json({
        success: true,
        message: `Tarif SPP berhasil diperbarui menjadi Rp${tarifBaru.toLocaleString('id-ID')}.`,
        data: { tarif: tarifBaru },
      });
    }

    if (aksi === 'generate_bulan') {
      const targetBulan = bulan ? Number(bulan) : new Date().getMonth() + 1;
      if (targetBulan < 1 || targetBulan > 12) {
        return NextResponse.json({ success: false, error: 'Bulan tidak valid (1-12).' }, { status: 400 });
      }

      const hasil = await generateSppSemuaSiswa(prisma, targetBulan);
      return NextResponse.json({
        success: true,
        message: `Berhasil menerbitkan ${hasil.dibuat} tagihan SPP untuk bulan ${NAMA_BULAN[targetBulan]} (Total ${hasil.totalSiswa} siswa aktif).`,
        data: hasil,
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (err) {
    console.error('Error update tarif spp:', err);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

