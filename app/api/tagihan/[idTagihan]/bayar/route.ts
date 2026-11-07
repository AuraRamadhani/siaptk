import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);

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
    const body = await request.json();
    const { metode, buktiTransfer } = body;

    if (!["TRANSFER", "TUNAI", "TABUNGAN"].includes(metode)) {
      return NextResponse.json({ success: false, error: "Metode tidak valid" }, { status: 400 });
    }
    // TUNAI & TABUNGAN langsung melunasi tagihan: hanya petugas.
    if (metode !== "TRANSFER" && !PETUGAS.has(sesi.peran)) {
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
    if (!PETUGAS.has(sesi.peran) && (tagihan as any).anak?.idKeluarga !== sesi.id) {
      return NextResponse.json({ success: false, error: "Tagihan bukan milik keluarga Anda." }, { status: 403 });
    }

    if ((tagihan as any).status === "LUNAS" || (tagihan as any).status === "DIBATALKAN") {
      return NextResponse.json({ success: false, error: "Tagihan sudah lunas atau dibatalkan" }, { status: 400 });
    }

    let newStatus: string;
    let pembayaranData: any = {
      idTagihan,
      metode,
    };

    if (metode === "TRANSFER") {
      if (!buktiTransfer) {
        return NextResponse.json({ success: false, error: "buktiTransfer wajib untuk metode TRANSFER" }, { status: 400 });
      }
      newStatus = "MENUNGGU_VERIFIKASI";
      pembayaranData.buktiTransfer = buktiTransfer;
    } else if (metode === "TUNAI") {
      newStatus = "LUNAS";
      pembayaranData.diverifikasiOleh = sesi.nama;
    } else {
      // TABUNGAN
      const rekening = (tagihan as any).anak?.rekeningTabungan;
      if (!rekening) {
        return NextResponse.json({ success: false, error: "Anak tidak memiliki rekening tabungan" }, { status: 400 });
      }
      const totalBayar = Number((tagihan as any).nominal) - Number((tagihan as any).diskon);
      if (Number(rekening.saldo) < totalBayar) {
        return NextResponse.json({ success: false, error: "Saldo tabungan tidak cukup" }, { status: 400 });
      }

      // Potong saldo + catat transaksi, atomik bersama pembayaran & tagihan.
      const [pembayaran] = await prisma.$transaction([
        prisma.pembayaran.create({
          data: { idTagihan, metode, diverifikasiOleh: sesi.nama },
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
      prisma.tagihan.update({ where: { idTagihan }, data: { status: newStatus as any } }),
    ]);

    return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
