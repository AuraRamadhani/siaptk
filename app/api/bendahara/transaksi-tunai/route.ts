/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { NAMA_BULAN } from '@/lib/tagihan';

const PETUGAS = new Set(['BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);

// GET /api/bendahara/transaksi-tunai -> Mengambil daftar seluruh siswa beserta tagihan belum lunas & saldo tabungan
export async function GET() {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const anakList = await prisma.anak.findMany({
      orderBy: { nama: 'asc' },
      include: {
        keluarga: {
          select: {
            idKeluarga: true,
            namaAyah: true,
            namaIbu: true,
            noHp: true,
          },
        },
        rekeningTabungan: true,
        tagihan: {
          include: { pembayaran: true },
          orderBy: { bulan: 'asc' },
        },
        riwayatKelompok: {
          include: { kelompok: true, tahunAjaran: true },
          orderBy: { tahunAjaran: { periode: 'desc' } },
        },
      },
    });

    const data = anakList.map((a) => {
      const kelompok = a.riwayatKelompok[0]?.kelompok?.nama || 'Belum Ada Kelompok';
      const saldo = a.rekeningTabungan ? Number(a.rekeningTabungan.saldo) : 0;
      const tagihanList = a.tagihan.map((t) => ({
        idTagihan: t.idTagihan,
        jenis: t.jenis,
        bulan: t.bulan,
        labelBulan: t.bulan ? `Bulan ${NAMA_BULAN[t.bulan] || t.bulan}` : null,
        nominal: Number(t.nominal) - Number(t.diskon || 0),
        status: t.status,
      }));

      return {
        idAnak: a.idAnak,
        nama: a.nama,
        nik: a.nik,
        status: a.status,
        kelompok,
        namaOrangTua: a.keluarga?.namaAyah || a.keluarga?.namaIbu || 'Orang Tua',
        noHp: a.keluarga?.noHp || '',
        idTabungan: a.rekeningTabungan?.idTabungan || null,
        saldoTabungan: saldo,
        tagihan: tagihanList,
      };
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API Transaksi Tunai GET Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// POST /api/bendahara/transaksi-tunai -> Input pembayaran/setoran tunai langsung di kantor sekolah
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Hanya bendahara yang berwenang input setoran tunai.' }, { status: 403 });
    }

    const body = await request.json();
    const { idAnak, kategori, nominal, idTagihan, bulanSpp, keterangan } = body;

    if (!idAnak || !kategori || !nominal || Number(nominal) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Data tidak lengkap (idAnak, kategori, dan nominal wajib diisi).' },
        { status: 400 }
      );
    }

    if (!['TABUNGAN', 'SPP', 'PENDAFTARAN'].includes(kategori)) {
      return NextResponse.json({ success: false, error: 'Kategori transaksi tidak valid.' }, { status: 400 });
    }

    const anak = await prisma.anak.findUnique({
      where: { idAnak },
      include: {
        keluarga: true,
        rekeningTabungan: true,
        tagihan: true,
      },
    });

    if (!anak) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan.' }, { status: 404 });
    }

    const namaPetugas = sesi.nama || 'Bendahara';
    const nominalNumber = Math.round(Number(nominal));

    const hasil = await prisma.$transaction(async (tx) => {
      // 1. KATEGORI: SETORAN TABUNGAN
      if (kategori === 'TABUNGAN') {
        const rekening = await tx.rekeningTabungan.upsert({
          where: { idAnak: anak.idAnak },
          update: {
            saldo: { increment: nominalNumber },
          },
          create: {
            idAnak: anak.idAnak,
            saldo: nominalNumber,
          },
        });

        const transaksi = await tx.transaksiTabungan.create({
          data: {
            idTabungan: rekening.idTabungan,
            jenis: 'SETOR',
            metode: 'TUNAI',
            nominal: nominalNumber,
            status: 'DIVERIFIKASI',
            keterangan: keterangan?.trim() || 'Setoran tunai langsung di kantor sekolah',
            dicatatOleh: namaPetugas,
          },
        });

        try {
          await tx.notifikasi.create({
            data: {
              idKeluarga: anak.idKeluarga,
              tipe: 'SETORAN_DIVERIFIKASI',
              judul: 'Setoran Tabungan Tunai Berhasil',
              pesan: `Alhamdulillah! Setoran tabungan tunai untuk ${anak.nama} sebesar Rp ${nominalNumber.toLocaleString('id-ID')} telah berhasil diterima dan diverifikasi oleh Bendahara (${namaPetugas}). Saldo tabungan telah bertambah.`,
              dataReferensi: JSON.stringify({ idTransaksi: transaksi.idTransaksi, idAnak: anak.idAnak, nominal: nominalNumber }),
            },
          });
        } catch (e) {
          console.error('Gagal kirim notif tabungan tunai:', e);
        }

        return {
          tipe: 'TABUNGAN',
          idTransaksi: transaksi.idTransaksi,
          nominal: nominalNumber,
          saldoBaru: Number(rekening.saldo),
          pesan: `Setoran tabungan tunai sebesar Rp ${nominalNumber.toLocaleString('id-ID')} untuk ${anak.nama} berhasil dicatat dan disinkronkan.`,
        };
      }

      // 2. KATEGORI: PEMBAYARAN SPP BULANAN
      if (kategori === 'SPP') {
        let tagihanTarget;

        if (idTagihan) {
          tagihanTarget = await tx.tagihan.findUnique({
            where: { idTagihan },
          });
        } else {
          // Cari tagihan SPP bulan berjalan atau bulan yang dipilih
          const targetBulan = bulanSpp ? Number(bulanSpp) : (new Date().getMonth() + 1);
          tagihanTarget = await tx.tagihan.findFirst({
            where: {
              idAnak: anak.idAnak,
              jenis: 'SPP',
              bulan: targetBulan,
            },
          });

          // Jika belum ada, buat tagihannya langsung
          if (!tagihanTarget) {
            tagihanTarget = await tx.tagihan.create({
              data: {
                idAnak: anak.idAnak,
                jenis: 'SPP',
                bulan: targetBulan,
                nominal: nominalNumber,
                diskon: 0,
                status: 'BELUM_BAYAR',
              },
            });
          }
        }

        if (!tagihanTarget) {
          throw new Error('Tagihan SPP tidak ditemukan.');
        }

        // Update status tagihan SPP menjadi LUNAS
        await tx.tagihan.update({
          where: { idTagihan: tagihanTarget.idTagihan },
          data: { status: 'LUNAS', nominal: nominalNumber },
        });

        // Catat bukti pembayaran tunai terverifikasi
        const pembayaran = await tx.pembayaran.create({
          data: {
            idTagihan: tagihanTarget.idTagihan,
            metode: 'TUNAI',
            diverifikasiOleh: namaPetugas,
            catatanVerifikasi: keterangan?.trim() || 'Pembayaran tunai SPP langsung di loket bendahara sekolah',
          },
        });

        const labelBulan = tagihanTarget.bulan ? `Bulan ${NAMA_BULAN[tagihanTarget.bulan] || tagihanTarget.bulan}` : '';

        try {
          await tx.notifikasi.create({
            data: {
              idKeluarga: anak.idKeluarga,
              tipe: 'PEMBAYARAN_DIVERIFIKASI',
              judul: `Pembayaran SPP ${labelBulan} Lunas`,
              pesan: `Alhamdulillah! Pembayaran tunai SPP ${labelBulan} untuk ${anak.nama} sebesar Rp ${nominalNumber.toLocaleString('id-ID')} telah diterima lunas dan diverifikasi oleh Bendahara (${namaPetugas}). Kuitansi digital sudah tersedia di portal Anda.`,
              dataReferensi: JSON.stringify({ idTagihan: tagihanTarget.idTagihan, idPembayaran: pembayaran.idPembayaran, jenis: 'SPP', status: 'LUNAS' }),
            },
          });
        } catch (e) {
          console.error('Gagal kirim notif SPP tunai:', e);
        }

        return {
          tipe: 'SPP',
          idTagihan: tagihanTarget.idTagihan,
          idPembayaran: pembayaran.idPembayaran,
          nominal: nominalNumber,
          pesan: `Pembayaran tunai SPP ${labelBulan} untuk ${anak.nama} sebesar Rp ${nominalNumber.toLocaleString('id-ID')} berhasil dicatat LUNAS. Kuitansi langsung tersinkron ke portal orang tua.`,
        };
      }

      // 3. KATEGORI: PEMBAYARAN BIAYA PENDAFTARAN
      if (kategori === 'PENDAFTARAN') {
        let tagihanTarget = await tx.tagihan.findFirst({
          where: {
            idAnak: anak.idAnak,
            jenis: 'PENDAFTARAN',
          },
        });

        if (!tagihanTarget) {
          tagihanTarget = await tx.tagihan.create({
            data: {
              idAnak: anak.idAnak,
              jenis: 'PENDAFTARAN',
              nominal: nominalNumber,
              diskon: 0,
              status: 'BELUM_BAYAR',
            },
          });
        }

        // Update tagihan pendaftaran menjadi LUNAS
        await tx.tagihan.update({
          where: { idTagihan: tagihanTarget.idTagihan },
          data: { status: 'LUNAS', nominal: nominalNumber },
        });

        // Catat bukti pembayaran tunai
        const pembayaran = await tx.pembayaran.create({
          data: {
            idTagihan: tagihanTarget.idTagihan,
            metode: 'TUNAI',
            diverifikasiOleh: namaPetugas,
            catatanVerifikasi: keterangan?.trim() || 'Pembayaran tunai pendaftaran langsung di kantor sekolah',
          },
        });

        // Aktifkan status siswa
        await tx.anak.update({
          where: { idAnak: anak.idAnak },
          data: { status: 'AKTIF' },
        });

        // Buat rekening tabungan awal jika belum ada
        await tx.rekeningTabungan.upsert({
          where: { idAnak: anak.idAnak },
          update: {},
          create: { idAnak: anak.idAnak, saldo: 0 },
        });

        try {
          await tx.notifikasi.create({
            data: {
              idKeluarga: anak.idKeluarga,
              tipe: 'PEMBAYARAN_DIVERIFIKASI',
              judul: 'Pembayaran Biaya Pendaftaran Lunas',
              pesan: `Alhamdulillah! Pembayaran tunai biaya pendaftaran untuk ${anak.nama} sebesar Rp ${nominalNumber.toLocaleString('id-ID')} telah diverifikasi LUNAS oleh Bendahara (${namaPetugas}). Ananda resmi berstatus siswa aktif.`,
              dataReferensi: JSON.stringify({ idTagihan: tagihanTarget.idTagihan, idPembayaran: pembayaran.idPembayaran, jenis: 'PENDAFTARAN', status: 'LUNAS' }),
            },
          });
        } catch (e) {
          console.error('Gagal kirim notif pendaftaran tunai:', e);
        }

        return {
          tipe: 'PENDAFTARAN',
          idTagihan: tagihanTarget.idTagihan,
          idPembayaran: pembayaran.idPembayaran,
          nominal: nominalNumber,
          pesan: `Pembayaran tunai pendaftaran untuk ${anak.nama} sebesar Rp ${nominalNumber.toLocaleString('id-ID')} berhasil dicatat LUNAS. Status siswa aktif dan kuitansi langsung tersimpan di portal orang tua.`,
        };
      }

      throw new Error('Kategori tidak didukung.');
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: hasil.pesan,
    });
  } catch (error) {
    console.error('API Transaksi Tunai POST Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

