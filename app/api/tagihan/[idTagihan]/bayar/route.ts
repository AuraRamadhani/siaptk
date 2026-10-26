import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const { idTagihan } = await params;
    const body = await request.json();
    const { metode, buktiTransfer, dicatatOleh, diverifikasiOleh } = body;

    if (!metode) {
      return NextResponse.json({ success: false, error: "metode wajib diisi" }, { status: 400 });
    }

    // Get the tagihan
    const tagihan = await prisma.tagihan.findUnique({
      where: { idTagihan },
      include: { anak: { include: { rekeningTabungan: true } } },
    });

    if (!tagihan) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
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
      pembayaranData.diverifikasiOleh = diverifikasiOleh || dicatatOleh || "Admin";
    } else if (metode === "TABUNGAN") {
      // Check saldo
      const rekening = (tagihan as any).anak?.rekeningTabungan;
      if (!rekening) {
        return NextResponse.json({ success: false, error: "Anak tidak memiliki rekening tabungan" }, { status: 400 });
      }
      const nominal = Number((tagihan as any).nominal);
      const diskon = Number((tagihan as any).diskon);
      const totalBayar = nominal - diskon;
      if (Number(rekening.saldo) < totalBayar) {
        return NextResponse.json({ success: false, error: "Saldo tabungan tidak cukup" }, { status: 400 });
      }

      // Deduct saldo and create transaksi
      await prisma.rekeningTabungan.update({
        where: { idTabungan: rekening.idTabungan },
        data: { saldo: { decrement: totalBayar } },
      });

      await prisma.transaksiTabungan.create({
        data: {
          idTabungan: rekening.idTabungan,
          jenis: "BAYAR_SPP",
          nominal: totalBayar,
          dicatatOleh: dicatatOleh || "Sistem",
        },
      });

      newStatus = "LUNAS";
      pembayaranData.diverifikasiOleh = dicatatOleh || "Sistem";
    } else {
      return NextResponse.json({ success: false, error: "Metode tidak valid" }, { status: 400 });
    }

    // Create pembayaran and update tagihan
    const [pembayaran] = await prisma.$transaction([
      prisma.pembayaran.create({ data: pembayaranData }),
      prisma.tagihan.update({ where: { idTagihan }, data: { status: newStatus } }),
    ]);

    return NextResponse.json({ success: true, data: pembayaran }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
