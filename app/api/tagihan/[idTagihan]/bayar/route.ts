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

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      metode = String(fd.get("metode") || "TRANSFER");
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

    if (metodeSah === "TRANSFER") {
      if (!buktiTransfer) {
        return NextResponse.json({ success: false, error: "buktiTransfer wajib untuk metode TRANSFER" }, { status: 400 });
      }
      newStatus = "MENUNGGU_VERIFIKASI";
      pembayaranData.buktiTransfer = buktiTransfer;
    } else if (metodeSah === "TUNAI") {
      newStatus = "LUNAS";
      pembayaranData.diverifikasiOleh = sesi.nama;
    } else {
      // TABUNGAN
      const rekening = tagihan.anak?.rekeningTabungan;
      if (!rekening) {
        return NextResponse.json({ success: false, error: "Anak tidak memiliki rekening tabungan" }, { status: 400 });
      }
      const totalBayar = Number(tagihan.nominal) - Number(tagihan.diskon);
      if (Number(rekening.saldo) < totalBayar) {
        return NextResponse.json({ success: false, error: "Saldo tabungan tidak cukup" }, { status: 400 });
      }

      // Potong saldo + catat transaksi, atomik bersama pembayaran & tagihan.
      const [pembayaran] = await prisma.$transaction([
        prisma.pembayaran.create({
          data: { idTagihan, metode: metodeSah, diverifikasiOleh: sesi.nama },
        }),
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

      return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
    }

    const [pembayaran] = await prisma.$transaction([
      prisma.pembayaran.create({ data: pembayaranData }),
      prisma.tagihan.update({ where: { idTagihan }, data: { status: newStatus as StatusTagihan } }),
    ]);

    return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
