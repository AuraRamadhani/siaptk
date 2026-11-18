import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StatusTagihan, MetodePembayaran } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import { sesiSekarang } from "@/lib/sesi";
import { writeFile } from "fs/promises";
import path from "path";
import { mkdirSync } from "fs";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);
const TIPE_BERKAS = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAKS_BERKAS = 5 * 1024 * 1024;
const namaAman = (nama: string) => nama.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

// Helper: kirim notifikasi pembayaran
async function kirimNotifikasiPembayaran(
  tx: any,
  idKeluarga: string,
  namaAnak: string,
  jenisTagihan: string,
  nominal: number,
  status: 'LUNAS' | 'MENUNGGU_VERIFIKASI' | 'DITOLAK',
  catatan?: string
) {
  const tipeMap = {
    LUNAS: 'PEMBAYARAN_DIVERIFIKASI',
    MENUNGGU_VERIFIKASI: 'TAGIHAN_BARU',
    DITOLAK: 'PEMBAYARAN_DITOLAK',
  };
  const judulMap = {
    LUNAS: 'Pembayaran Diverifikasi (Lunas)',
    MENUNGGU_VERIFIKASI: 'Bukti Pembayaran Diterima',
    DITOLAK: 'Pembayaran Ditolak',
  };
  const pesanMap = {
    LUNAS: `Pembayaran ${jenisTagihan} sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${namaAnak} telah diverifikasi. Status tagihan: LUNAS.`,
    MENUNGGU_VERIFIKASI: `Bukti pembayaran ${jenisTagihan} sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${namaAnak} telah diterima dan menunggu verifikasi bendahara.`,
    DITOLAK: `Pembayaran ${jenisTagihan} sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${namaAnak} ditolak.${catatan ? ` Alasan: ${catatan}` : ''} Silakan unggah ulang bukti yang benar.`,
  };

  await tx.notifikasi.create({
    data: {
      idKeluarga,
      tipe: tipeMap[status],
      judul: judulMap[status],
      pesan: pesanMap[status],
      dataReferensi: JSON.stringify({ jenis: 'pembayaran', tagihan: jenisTagihan, nominal, status }),
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { idTagihan } = await params;
    const contentType = request.headers.get("content-type") || "";

    let metode = "";
    let buktiTransfer = "";
    let idBooking: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      metode = String(fd.get("metode") || "TRANSFER");
      idBooking = fd.get("idBooking") ? String(fd.get("idBooking")) : null;
      const file = fd.get("buktiTransfer");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAKS_BERKAS) {
          return NextResponse.json({ success: false, error: "Ukuran file maksimal 5 MB." }, { status: 400 });
        }
        if (!TIPE_BERKAS.has(file.type)) {
          return NextResponse.json({ success: false, error: "Format file harus JPG, PNG, atau PDF." }, { status: 400 });
        }
        const uploadDir = path.join(process.cwd(), "public/uploads");
        mkdirSync(uploadDir, { recursive: true });
        const namaFile = `bukti_${Date.now()}_${namaAman(file.name)}`;
        await writeFile(path.join(uploadDir, namaFile), Buffer.from(await file.arrayBuffer()));
        buktiTransfer = namaFile;
      } else if (typeof fd.get("buktiTransfer") === "string") {
        buktiTransfer = String(fd.get("buktiTransfer"));
      }
    } else {
      const body = await request.json();
      metode = body.metode;
      buktiTransfer = body.buktiTransfer;
      idBooking = body.idBooking || null;
    }

    if (!["TRANSFER", "TUNAI", "TABUNGAN"].includes(metode)) {
      return NextResponse.json({ success: false, error: "Metode tidak valid" }, { status: 400 });
    }
    const metodeSah = metode as MetodePembayaran;
    // TUNAI & TABUNGAN langsung melunasi tagihan: hanya petugas.
    if (metodeSah !== "TRANSFER" && !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Metode ini hanya untuk bendahara." }, { status: 403 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { idTagihan },
      include: { anak: { include: { rekeningTabungan: true } } },
    });

    if (!tagihan) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    // Orang tua hanya boleh membayar tagihan anaknya sendiri.
    if (!PETUGAS.has(sesi.peran) && tagihan.anak?.idKeluarga !== sesi.id) {
      return NextResponse.json({ success: false, error: "Tagihan bukan milik keluarga Anda." }, { status: 403 });
    }

    if (tagihan.status === "LUNAS" || tagihan.status === "DIBATALKAN") {
      return NextResponse.json({ success: false, error: "Tagihan sudah lunas atau dibatalkan" }, { status: 400 });
    }

    let newStatus: string;
    const pembayaranData: Prisma.PembayaranUncheckedCreateInput = {
      idTagihan,
      metode: metodeSah,
    };

    const namaAnak = tagihan.anak?.nama || 'Anak';
    const idKeluarga = tagihan.anak?.idKeluarga || '';
    const jenisTagihan = tagihan.jenis === 'PENDAFTARAN' ? 'Biaya Pendaftaran' : `SPP Bulan ${tagihan.bulan || '-'}`;
    const totalBayar = Number(tagihan.nominal) - Number(tagihan.diskon);

    if (metodeSah === "TRANSFER") {
      if (!buktiTransfer) {
        return NextResponse.json({ success: false, error: "buktiTransfer wajib untuk metode TRANSFER" }, { status: 400 });
      }
      newStatus = "MENUNGGU_VERIFIKASI";
      pembayaranData.buktiTransfer = buktiTransfer;
    } else if (metodeSah === "TUNAI") {
      // TUNAI dengan booking oleh orang tua -> status MENUNGGU_VERIFIKASI (butuh verifikasi bendahara saat datang)
      // TUNAI langsung oleh bendahara -> LUNAS
      if (PETUGAS.has(sesi.peran)) {
        newStatus = "LUNAS";
        pembayaranData.diverifikasiOleh = sesi.nama;
      } else {
        if (!idBooking) {
          return NextResponse.json({ success: false, error: "idBooking wajib untuk pembayaran tunai (booking kedatangan)." }, { status: 400 });
        }
        newStatus = "MENUNGGU_VERIFIKASI";
        // booking akan diupdate di transaction
      }
    } else {
      // TABUNGAN
      const rekening = tagihan.anak?.rekeningTabungan;
      if (!rekening) {
        return NextResponse.json({ success: false, error: "Anak tidak memiliki rekening tabungan" }, { status: 400 });
      }
      if (Number(rekening.saldo) < totalBayar) {
        return NextResponse.json({ success: false, error: "Saldo tabungan tidak cukup" }, { status: 400 });
      }

      // Potong saldo + catat transaksi, atomik bersama pembayaran & tagihan.
      const [pembayaran] = await prisma.$transaction([
        prisma.pembayaran.create({ data: { idTagihan, metode: metodeSah, diverifikasiOleh: sesi.nama } }),
        prisma.tagihan.update({ where: { idTagihan }, data: { status: "LUNAS" } }),
        prisma.rekeningTabungan.update({
          where: { idTabungan: rekening.idTabungan },
          data: { saldo: { decrement: totalBayar } },
        }),
        prisma.transaksiTabungan.create({
          data: {
            idTabungan: rekening.idTabungan,
            jenis: "BAYAR_SPP",
            nominal: totalBayar,
            dicatatOleh: sesi.nama,
          },
        }),
      ]);

      await kirimNotifikasiPembayaran(prisma, idKeluarga, namaAnak, jenisTagihan, totalBayar, 'LUNAS');

      return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
    }

    const [pembayaran] = await prisma.$transaction(async (tx) => {
      const pb = await tx.pembayaran.create({ data: pembayaranData });
      await tx.tagihan.update({ where: { idTagihan }, data: { status: newStatus as StatusTagihan } });

      // Update booking jika ada
      if (idBooking) {
        await tx.bookingKunjungan.update({
          where: { idBooking },
          data: { status: 'DIKONFIRMASI', catatanBendahara: `Pembayaran ${jenisTagihan} Rp${totalBayar.toLocaleString('id-ID')} menunggu verifikasi` },
        });
      }

      // Notifikasi
      if (newStatus === "MENUNGGU_VERIFIKASI") {
        await kirimNotifikasiPembayaran(tx, idKeluarga, namaAnak, jenisTagihan, totalBayar, 'MENUNGGU_VERIFIKASI');
      } else if (newStatus === "LUNAS") {
        await kirimNotifikasiPembayaran(tx, idKeluarga, namaAnak, jenisTagihan, totalBayar, 'LUNAS');
      }

      return [pb];
    });

    return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}