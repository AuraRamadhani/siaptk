import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idTagihanList, metode, buktiTransfer, dicatatOleh } = body;

    if (!idTagihanList || !Array.isArray(idTagihanList) || idTagihanList.length === 0) {
      return NextResponse.json({ success: false, error: "idTagihanList wajib diisi" }, { status: 400 });
    }
    if (!metode) {
      return NextResponse.json({ success: false, error: "metode wajib diisi" }, { status: 400 });
    }

    // Fetch all tagihan
    const tagihanList = await prisma.tagihan.findMany({
      where: { idTagihan: { in: idTagihanList } },
      include: { anak: { include: { rekeningTabungan: true } } },
    });

    const results: any[] = [];
    const ops: any[] = [];

    for (const tagihan of tagihanList) {
      const nominal = Number((tagihan as any).nominal);
      const diskon = Number((tagihan as any).diskon);
      const totalBayar = nominal - diskon;
      let newStatus: string;
      let pembayaranData: any = {
        idTagihan: tagihan.idTagihan,
        metode,
      };

      if (metode === "TRANSFER") {
        newStatus = "MENUNGGU_VERIFIKASI";
        pembayaranData.buktiTransfer = buktiTransfer || null;
      } else if (metode === "TUNAI") {
        newStatus = "LUNAS";
        pembayaranData.diverifikasiOleh = dicatatOleh || "Admin";
      } else if (metode === "TABUNGAN") {
        const rekening = (tagihan as any).anak?.rekeningTabungan;
        if (!rekening || Number(rekening.saldo) < totalBayar) {
          results.push({ idTagihan: tagihan.idTagihan, status: "GAGAL", error: "Saldo tidak cukup", nominal: totalBayar });
          continue;
        }
        await prisma.rekeningTabungan.update({
          where: { idTabungan: rekening.idTabungan },
          data: { saldo: { decrement: totalBayar } },
        });
        await prisma.transaksiTabungan.create({
          data: { idTabungan: rekening.idTabungan, jenis: "BAYAR_SPP", nominal: totalBayar, dicatatOleh: dicatatOleh || "Sistem" },
        });
        newStatus = "LUNAS";
        pembayaranData.diverifikasiOleh = dicatatOleh || "Sistem";
      } else {
        results.push({ idTagihan: tagihan.idTagihan, status: "GAGAL", error: "Metode tidak valid", nominal: totalBayar });
        continue;
      }

      const pembayaran = await prisma.pembayaran.create({ data: pembayaranData });
      await prisma.tagihan.update({ where: { idTagihan: tagihan.idTagihan }, data: { status: newStatus } });

      results.push({
        idTagihan: tagihan.idTagihan,
        idPembayaran: pembayaran.idPembayaran,
        nominal: totalBayar,
        status: newStatus,
      });
    }

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
