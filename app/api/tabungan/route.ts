import { NextResponse } from 'next/server';
import { prisma, KELUARGA_AMAN } from '@/lib/prisma';
import type { StatusVerifikasi } from '@/app/generated/prisma/client';
import { sesiSekarang } from '@/lib/sesi';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';

const TIPE_BUKTI = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAKS_BUKTI = 5 * 1024 * 1024;
const namaAman = (nama: string) => nama.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

// GET /api/tabungan?email=...            -> semua tabungan milik keluarga (portal orang tua)
// GET /api/tabungan?status=MENUNGGU      -> antrean verifikasi (portal bendahara)
// GET /api/tabungan?idAnak=...           -> satu rekening + riwayat
export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const status = searchParams.get('status');
    const idAnak = searchParams.get('idAnak');

    const transaksiSelect = {
      orderBy: { createdAt: 'desc' as const },
      select: {
        idTransaksi: true,
        jenis: true,
        metode: true,
        nominal: true,
        keterangan: true,
        bukti: true,
        status: true,
        dicatatOleh: true,
        createdAt: true,
        idTagihan: true,
      },
    };

    if (status) {
      if (sesi.peran !== 'BENDAHARA' && sesi.peran !== 'KEPALA_SEKOLAH') {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      const antrean = await prisma.transaksiTabungan.findMany({
        where: { status: status as StatusVerifikasi },
        orderBy: { createdAt: 'asc' },
        include: {
          tabungan: { include: { anak: { include: { keluarga: { select: KELUARGA_AMAN } } } } },
        },
      });
      return NextResponse.json({ success: true, data: antrean });
    }

    if (idAnak) {
      const rekening = await prisma.rekeningTabungan.findUnique({
        where: { idAnak },
        include: { transaksi: transaksiSelect, anak: true },
      });
      if (!rekening) {
        return NextResponse.json({ success: false, error: 'Rekening tidak ditemukan.' }, { status: 404 });
      }
      // Orang tua hanya boleh melihat rekening anaknya sendiri.
      if (sesi.peran === 'ORANG_TUA' && rekening.anak.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, data: rekening });
    }

    if (email) {
      if (sesi.peran !== 'ORANG_TUA') {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      const keluarga = await prisma.keluarga.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          anak: {
            include: {
              rekeningTabungan: { include: { transaksi: transaksiSelect } },
              tagihan: true,
            },
          },
        },
      });
      if (!keluarga) {
        return NextResponse.json({ success: false, error: 'Keluarga tidak ditemukan.' }, { status: 404 });
      }
      // Cegah baca data keluarga lain.
      if (keluarga.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, data: keluarga.anak });
    }

    // ringkasan seluruh siswa (dipakai bendahara & kepala sekolah)
    if (sesi.peran !== 'BENDAHARA' && sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }
    const rekening = await prisma.rekeningTabungan.findMany({
      include: { anak: { include: { keluarga: { select: KELUARGA_AMAN } } } },
      orderBy: { saldo: 'desc' },
    });
    return NextResponse.json({ success: true, data: rekening });
  } catch (error) {
    console.error('API Tabungan GET Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/tabungan -> pengajuan / pencatatan transaksi baru
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
    let idAnak = '';
    let jenis = '';
    let nominal: unknown = 0;
    let metode = 'TUNAI';
    let keterangan: string | null = null;
    let idTagihan: string | null = null;
    let buktiFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      idAnak = String(fd.get('idAnak') || '');
      jenis = String(fd.get('jenis') || '');
      nominal = fd.get('nominal');
      metode = String(fd.get('metode') || 'TRANSFER');
      keterangan = fd.get('keterangan') ? String(fd.get('keterangan')) : null;
      idTagihan = fd.get('idTagihan') ? String(fd.get('idTagihan')) : null;
      const f = fd.get('bukti');
      if (f instanceof File && f.size > 0) buktiFile = f;
    } else {
      const body = await request.json();
      idAnak = body.idAnak;
      jenis = body.jenis;
      nominal = body.nominal;
      metode = body.metode || 'TUNAI';
      keterangan = body.keterangan || null;
      idTagihan = body.idTagihan || null;
    }

    const nilai = Number(nominal);
    if (!idAnak || !['SETOR', 'TARIK', 'BAYAR_SPP'].includes(jenis)) {
      return NextResponse.json({ success: false, error: 'idAnak dan jenis transaksi wajib diisi.' }, { status: 400 });
    }
    if (!Number.isFinite(nilai) || nilai <= 0) {
      return NextResponse.json({ success: false, error: 'Nominal harus lebih besar dari 0.' }, { status: 400 });
    }

    if (buktiFile) {
      if (buktiFile.size > MAKS_BUKTI) {
        return NextResponse.json({ success: false, error: 'Ukuran bukti maksimal 5 MB.' }, { status: 400 });
      }
      if (!TIPE_BUKTI.has(buktiFile.type)) {
        return NextResponse.json({ success: false, error: 'Format bukti harus JPG, PNG, atau PDF.' }, { status: 400 });
      }
    }

    const anak = await prisma.anak.findUnique({ where: { idAnak }, include: { rekeningTabungan: true } });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan.' }, { status: 404 });
    }

    // Orang tua hanya boleh mengajukan transaksi untuk anaknya sendiri, dan tidak boleh menarik dana.
    const staf = sesi.peran === 'BENDAHARA' || sesi.peran === 'KEPALA_SEKOLAH';
    if (!staf) {
      if (anak.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Anak bukan tanggungan akun ini.' }, { status: 403 });
      }
      if (jenis === 'TARIK') {
        return NextResponse.json({ success: false, error: 'Penarikan hanya dapat dilakukan bendahara.' }, { status: 403 });
      }
    }

    let rekening = anak.rekeningTabungan;
    if (!rekening) {
      if (jenis !== 'SETOR') {
        return NextResponse.json({ success: false, error: 'Rekening tabungan siswa belum dibuat.' }, { status: 404 });
      }
      rekening = await prisma.rekeningTabungan.create({
        data: { idAnak, saldo: 0 },
      });
    }

    let buktiFilename: string | null = null;
    if (buktiFile) {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      mkdirSync(uploadDir, { recursive: true });
      buktiFilename = `tabungan_${Date.now()}_${namaAman(buktiFile.name)}`;
      await writeFile(path.join(uploadDir, buktiFilename), Buffer.from(await buktiFile.arrayBuffer()));
    }

    // Setoran tunai yang dicatat langsung oleh bendahara sah tanpa antrean verifikasi.
    const langsungSah = jenis === 'SETOR' && metode === 'TUNAI' && staf;

    if (jenis !== 'SETOR') {
      if (Number(rekening.saldo) < nilai) {
        return NextResponse.json(
          { success: false, error: 'Saldo tabungan tidak mencukupi.' },
          { status: 422 }
        );
      }
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksiTabungan.create({
        data: {
          idTabungan: rekening.idTabungan,
          jenis: jenis as 'SETOR' | 'TARIK' | 'BAYAR_SPP',
          metode: (metode as 'TRANSFER' | 'TUNAI' | 'TABUNGAN') || 'TUNAI',
          nominal: nilai,
          keterangan: keterangan || null,
          bukti: buktiFilename,
          idTagihan: idTagihan || null,
          // Dicatat dari sesi, bukan dari body: jejak audit tidak bisa dipalsukan klien.
          dicatatOleh: sesi.nama,
          status: langsungSah ? 'DIVERIFIKASI' : 'MENUNGGU',
        },
      });

      if (langsungSah) {
        await tx.rekeningTabungan.update({
          where: { idTabungan: rekening.idTabungan },
          data: { saldo: { increment: nilai } },
        });
      }
      return trx;
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: langsungSah ? 'Setoran tercatat dan saldo diperbarui.' : 'Pengajuan setoran dikirim ke Bendahara untuk verifikasi.',
    });
  } catch (error) {
    console.error('API Tabungan POST Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/tabungan -> verifikasi / tolak pengajuan oleh bendahara
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    if (sesi.peran !== 'BENDAHARA' && sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const body = await request.json();
    const { idTransaksi, aksi } = body;

    if (!idTransaksi || !['verifikasi', 'tolak'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idTransaksi dan aksi (verifikasi/tolak) wajib diisi.' }, { status: 400 });
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksiTabungan.findUnique({
        where: { idTransaksi },
        include: { tabungan: true },
      });
      if (!trx) throw Object.assign(new Error('Transaksi tidak ditemukan.'), { http: 404 });
      if (trx.status !== 'MENUNGGU') throw Object.assign(new Error('Transaksi ini sudah diproses.'), { http: 409 });

      if (aksi === 'tolak') {
        return tx.transaksiTabungan.update({
          where: { idTransaksi },
          data: { status: 'DITOLAK', dicatatOleh: sesi.nama },
        });
      }

      const saldoSekarang = Number(trx.tabungan.saldo);
      const nominal = Number(trx.nominal);
      const delta = trx.jenis === 'SETOR' ? nominal : -nominal;
      if (saldoSekarang + delta < 0) {
        throw Object.assign(new Error('Saldo tidak mencukupi untuk menyetujui pengajuan ini.'), { http: 422 });
      }

      await tx.rekeningTabungan.update({
        where: { idTabungan: trx.idTabungan },
        data: { saldo: { increment: delta } },
      });

      if (trx.jenis === 'BAYAR_SPP') {
        if (!trx.idTagihan) throw Object.assign(new Error('Transaksi BAYAR_SPP tanpa idTagihan.'), { http: 422 });
        await tx.tagihan.update({ where: { idTagihan: trx.idTagihan }, data: { status: 'LUNAS' } });
        await tx.pembayaran.create({
          data: {
            idTagihan: trx.idTagihan,
            metode: 'TABUNGAN',
            diverifikasiOleh: sesi.nama,
          },
        });
      }

      return tx.transaksiTabungan.update({
        where: { idTransaksi },
        data: { status: 'DIVERIFIKASI', dicatatOleh: sesi.nama },
      });
    });

    return NextResponse.json({ success: true, data: hasil, message: aksi === 'tolak' ? 'Pengajuan ditolak.' : 'Transaksi diverifikasi.' });
  } catch (error) {
    console.error('API Tabungan PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Kesalahan server.' },
      { status: (error as { http?: number }).http || 500 }
    );
  }
}