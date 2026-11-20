import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import type { StatusVerifikasi } from '@/app/generated/prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdirSync } from 'fs';

const TIPE_BUKTI = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAKS_BUKTI = 5 * 1024 * 1024;
const namaAman = (nama: string) => nama.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

const PETUGAS = new Set(['BENDAHARA', 'KEPALA_SEKOLAH']);

// GET /api/penarikan-tabungan?idAnak=... -> detail penarikan anak (orang tua)
// GET /api/penarikan-tabungan?status=MENUNGGU -> antrean verifikasi (bendahara)
export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const idAnak = searchParams.get('idAnak');
    const status = searchParams.get('status');

    const includeRelasi = {
      tabungan: { include: { anak: { include: { keluarga: true } } } },
    };

    // Antrean verifikasi untuk bendahara
    if (status) {
      if (!PETUGAS.has(sesi.peran)) {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      const antrean = await prisma.penarikanTabungan.findMany({
        where: { status: status as StatusVerifikasi },
        orderBy: { createdAt: 'desc' },
        include: includeRelasi,
      });
      return NextResponse.json(
        { success: true, data: antrean },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Detail untuk orang tua (hanya anak sendiri)
    if (idAnak) {
      const rekening = await prisma.rekeningTabungan.findUnique({
        where: { idAnak },
        include: { anak: true, penarikan: { orderBy: { createdAt: 'desc' } } },
      });
      if (!rekening) {
        return NextResponse.json({ success: false, error: 'Rekening tidak ditemukan.' }, { status: 404 });
      }
      if (sesi.peran === 'ORANG_TUA' && rekening.anak.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, data: rekening });
    }

    // Ringkasan semua (bendahara/kepala sekolah)
    if (!PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }
    const penarikan = await prisma.penarikanTabungan.findMany({
      orderBy: { createdAt: 'desc' },
      include: includeRelasi,
    });
    return NextResponse.json({ success: true, data: penarikan });
  } catch (error) {
    console.error('API PenarikanTabungan GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// POST /api/penarikan-tabungan -> ajukan penarikan (orang tua)
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });

    const body = await request.json();
    const { idAnak, nominal, keterangan } = body;

    if (!idAnak || typeof nominal !== 'number' || nominal <= 0) {
      return NextResponse.json({ success: false, error: 'idAnak dan nominal (>0) wajib diisi.' }, { status: 400 });
    }

    const anak = await prisma.anak.findUnique({
      where: { idAnak },
      include: { rekeningTabungan: true },
    });
    if (!anak) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan.' }, { status: 404 });
    }

    // Hanya orang tua anak tsb yang boleh ajukan
    if (sesi.peran !== 'BENDAHARA' && sesi.peran !== 'KEPALA_SEKOLAH') {
      if (anak.idKeluarga !== sesi.id) {
        return NextResponse.json({ success: false, error: 'Anak bukan tanggungan akun ini.' }, { status: 403 });
      }
    }

    const rekening = anak.rekeningTabungan;
    if (!rekening) {
      return NextResponse.json({ success: false, error: 'Rekening tabungan siswa belum dibuat.' }, { status: 404 });
    }

    if (Number(rekening.saldo) < nominal) {
      return NextResponse.json({ success: false, error: 'Saldo tabungan tidak mencukupi.' }, { status: 422 });
    }

    const penarikan = await prisma.penarikanTabungan.create({
      data: {
        idTabungan: rekening.idTabungan,
        nominal,
        keterangan: keterangan || 'Penarikan tabungan oleh orang tua',
        diajukanOleh: sesi.nama,
        status: 'MENUNGGU',
      },
      include: { tabungan: { include: { anak: true } } },
    });

    // Kirim notifikasi ke bendahara (opsional, bisa via sistem notifikasi global)
    await prisma.notifikasi.create({
      data: {
        idKeluarga: anak.idKeluarga,
        tipe: 'PENARIKAN_DITOLAK', // tipe sementara, akan diubah saat diverifikasi
        judul: 'Pengajuan Penarikan Tabungan',
        pesan: `Pengajuan penarikan tabungan sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${anak.nama} telah dikirim dan menunggu verifikasi bendahara.`,
        dataReferensi: JSON.stringify({ idPenarikan: penarikan.idPenarikan, tipe: 'penarikan' }),
      },
    });

    return NextResponse.json({
      success: true,
      data: penarikan,
      message: 'Pengajuan penarikan dikirim ke Bendahara untuk verifikasi.',
    });
  } catch (error) {
    console.error('API PenarikanTabungan POST Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/penarikan-tabungan -> verifikasi/tolak oleh bendahara
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    if (!PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let idPenarikan = '';
    let aksi = '';
    let catatanPenolakan: string | null = null;
    let catatanVerifikasi: string | null = null;
    let buktiFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      idPenarikan = String(fd.get('idPenarikan') || '');
      aksi = String(fd.get('aksi') || '');
      catatanPenolakan = fd.get('catatanPenolakan') ? String(fd.get('catatanPenolakan')) : null;
      catatanVerifikasi = fd.get('catatanVerifikasi') ? String(fd.get('catatanVerifikasi')) : null;
      const f = fd.get('buktiTransfer');
      if (f instanceof File && f.size > 0) buktiFile = f;
    } else {
      const body = await request.json();
      idPenarikan = body.idPenarikan;
      aksi = body.aksi;
      catatanPenolakan = body.catatanPenolakan || null;
      catatanVerifikasi = body.catatanVerifikasi || null;
    }

    if (!idPenarikan || !['verifikasi', 'tolak'].includes(aksi)) {
      return NextResponse.json({ success: false, error: 'idPenarikan dan aksi (verifikasi/tolak) wajib diisi.' }, { status: 400 });
    }
    if (aksi === 'tolak' && !catatanPenolakan?.trim()) {
      return NextResponse.json({ success: false, error: 'Catatan penolakan wajib diisi.' }, { status: 400 });
    }

    if (buktiFile) {
      if (buktiFile.size > MAKS_BUKTI) {
        return NextResponse.json({ success: false, error: 'Ukuran bukti transfer maksimal 5 MB.' }, { status: 400 });
      }
      if (!TIPE_BUKTI.has(buktiFile.type)) {
        return NextResponse.json({ success: false, error: 'Format bukti harus JPG, PNG, atau PDF.' }, { status: 400 });
      }
    }

    let buktiFilename: string | null = null;
    if (buktiFile) {
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      mkdirSync(uploadDir, { recursive: true });
      buktiFilename = `penarikan_${Date.now()}_${namaAman(buktiFile.name)}`;
      await writeFile(path.join(uploadDir, buktiFilename), Buffer.from(await buktiFile.arrayBuffer()));
    }

    const hasil = await prisma.$transaction(async (tx) => {
      const penarikan = await tx.penarikanTabungan.findUnique({
        where: { idPenarikan },
        include: { tabungan: { include: { anak: true } } },
      });
      if (!penarikan) throw Object.assign(new Error('Penarikan tidak ditemukan.'), { http: 404 });
      if (penarikan.status !== 'MENUNGGU') throw Object.assign(new Error('Penarikan ini sudah diproses.'), { http: 409 });

      const saldoSekarang = Number(penarikan.tabungan.saldo);
      const nominal = Number(penarikan.nominal);

      if (aksi === 'tolak') {
        const updated = await tx.penarikanTabungan.update({
          where: { idPenarikan },
          data: { status: 'DITOLAK', catatanPenolakan, diverifikasiOleh: sesi.nama },
        });

        // Notifikasi ke orang tua
        await tx.notifikasi.create({
          data: {
            idKeluarga: penarikan.tabungan.anak.idKeluarga,
            tipe: 'PENARIKAN_DITOLAK',
            judul: 'Penarikan Tabungan Ditolak',
            pesan: `Pengajuan penarikan tabungan sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${penarikan.tabungan.anak.nama} ditolak. Alasan: ${catatanPenolakan}`,
            dataReferensi: JSON.stringify({ idPenarikan: updated.idPenarikan, tipe: 'penarikan', status: 'DITOLAK' }),
          },
        });

        return updated;
      }

      // Verifikasi: cek saldo cukup
      if (saldoSekarang < nominal) {
        throw Object.assign(new Error('Saldo tidak mencukupi untuk menyetujui penarikan ini.'), { http: 422 });
      }

      // Kurangi saldo & catat transaksi TARIK
      await tx.rekeningTabungan.update({
        where: { idTabungan: penarikan.idTabungan },
        data: { saldo: { decrement: nominal } },
      });

      await tx.transaksiTabungan.create({
        data: {
          idTabungan: penarikan.idTabungan,
          jenis: 'TARIK',
          metode: buktiFilename ? 'TRANSFER' : 'TUNAI',
          nominal,
          keterangan: catatanVerifikasi || penarikan.keterangan || (buktiFilename ? 'Penarikan transfer ke rekening orang tua' : 'Penarikan tunai di kantor bendahara'),
          bukti: buktiFilename,
          dicatatOleh: sesi.nama,
          status: 'DIVERIFIKASI',
        },
      });

      const updated = await tx.penarikanTabungan.update({
        where: { idPenarikan },
        data: {
          status: 'DIVERIFIKASI',
          diverifikasiOleh: sesi.nama,
          buktiTransfer: buktiFilename,
        },
      });

      // Notifikasi ke orang tua
      await tx.notifikasi.create({
        data: {
          idKeluarga: penarikan.tabungan.anak.idKeluarga,
          tipe: 'PENARIKAN_DIVERIFIKASI',
          judul: 'Penarikan Tabungan Disetujui',
          pesan: buktiFilename
            ? `Pengajuan penarikan tabungan sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${penarikan.tabungan.anak.nama} telah disetujui dan berhasil ditransfer ke rekening orang tua. Saldo terbaru: Rp${(saldoSekarang - nominal).toLocaleString('id-ID')}.`
            : `Pengajuan penarikan tabungan sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${penarikan.tabungan.anak.nama} telah disetujui. Uang tunai dapat diambil di kantor bendahara. Saldo terbaru: Rp${(saldoSekarang - nominal).toLocaleString('id-ID')}.`,
          dataReferensi: JSON.stringify({ idPenarikan: updated.idPenarikan, tipe: 'penarikan', status: 'DIVERIFIKASI', buktiTransfer: buktiFilename }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: aksi === 'tolak'
        ? 'Penarikan ditolak.'
        : buktiFilename
        ? 'Penarikan berhasil diverifikasi dan bukti transfer telah tersimpan.'
        : 'Penarikan diverifikasi, saldo dipotong, dan slip dicatat.',
    });
  } catch (error) {
    const status = (error as { http?: number }).http || 500;
    // Penolakan wajar (mis. transaksi sudah diproses) bukan kegagalan server:
    // dicatat sebagai peringatan agar log tidak penuh kesan error.
    if (status >= 500) console.error('API PenarikanTabungan PATCH Error:', error);
    else console.warn('API PenarikanTabungan PATCH ditolak:', (error as Error).message || error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Kesalahan server.' },
      { status }
    );
  }
}