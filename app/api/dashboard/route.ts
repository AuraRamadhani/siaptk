import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

// GET /api/dashboard -> KPI ringkas untuk kepala sekolah & bendahara
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !['KEPALA_SEKOLAH', 'BENDAHARA'].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const [
      totalSiswa,
      siswaAktif,
      pendaftar,
      rekening,
      tagihan,
      transaksiBulanIni,
      antreanVerifikasi,
    ] = await Promise.all([
      prisma.anak.count(),
      prisma.anak.count({ where: { status: 'AKTIF' } }),
      prisma.anak.count({ where: { status: 'PENDAFTAR' } }),
      prisma.rekeningTabungan.findMany({ select: { saldo: true } }),
      prisma.tagihan.findMany({ select: { jenis: true, nominal: true, diskon: true, status: true } }),
      prisma.transaksiTabungan.findMany({
        select: { jenis: true, nominal: true },
      }),
      prisma.tagihan.count({ where: { status: 'MENUNGGU_VERIFIKASI' } }),
    ]);

    const rupiah = (n: number) => Math.round(n * 100) / 100;

    const totalSaldo = rekening.reduce((s, r) => s + Number(r.saldo), 0);
    const totalTagihan = tagihan
      .filter((t) => t.status !== 'DIBATALKAN')
      .reduce((s, t) => s + Number(t.nominal) - Number(t.diskon), 0);
    const tunggakan = tagihan
      .filter((t) => t.status === 'BELUM_BAYAR' || t.status === 'MENUNGGU_VERIFIKASI')
      .reduce((s, t) => s + Number(t.nominal) - Number(t.diskon), 0);
    const lunas = tagihan.filter((t) => t.status === 'LUNAS');

    const perJenis = ['SPP', 'PENDAFTARAN'].map((jenis) => {
      const rows = tagihan.filter((t) => t.jenis === jenis);
      return {
        jenis,
        jumlah: rows.length,
        lunas: rows.filter((t) => t.status === 'LUNAS').length,
        nominal: rupiah(rows.reduce((s, t) => s + Number(t.nominal) - Number(t.diskon), 0)),
      };
    });

    const setorBulanIni = transaksiBulanIni
      .filter((t) => t.jenis === 'SETOR')
      .reduce((s, t) => s + Number(t.nominal), 0);
    const tarikBulanIni = transaksiBulanIni
      .filter((t) => t.jenis !== 'SETOR')
      .reduce((s, t) => s + Number(t.nominal), 0);

    return NextResponse.json({
      success: true,
      data: {
        siswa: { total: totalSiswa, aktif: siswaAktif, pendaftar },
        keuangan: {
          totalSaldo: rupiah(totalSaldo),
          totalTagihan: rupiah(totalTagihan),
          tunggakan: rupiah(tunggakan),
          persenTertagih: totalTagihan > 0 ? Math.round(((totalTagihan - tunggakan) / totalTagihan) * 100) : 0,
          tagihanLunas: lunas.length,
        },
        bulanIni: {
          setor: rupiah(setorBulanIni),
          tarik: rupiah(tarikBulanIni),
          jumlahTransaksi: transaksiBulanIni.length,
          antreanVerifikasi,
        },
        perJenis,
      },
    });
  } catch (error: any) {
    console.error('API Dashboard Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

function awalBulan(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}