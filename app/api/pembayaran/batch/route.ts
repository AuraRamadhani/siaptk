import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);

export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await request.json();
    const { idTagihanList, metode, buktiTransfer } = body;

    if (!idTagihanList || !Array.isArray(idTagihanList) || idTagihanList.length === 0) {
      return NextResponse.json({ success: false, error: "idTagihanList wajib diisi" }, { status: 400 });
    }
    if (!["TRANSFER", "TUNAI", "TABUNGAN"].includes(metode)) {
      return NextResponse.json({ success: false, error: "metode tidak valid" }, { status: 400 });
    }
    // TUNAI & TABUNGAN langsung melunasi tagihan: hanya petugas.
    if (metode !== "TRANSFER" && !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Metode ini hanya untuk bendahara." }, { status: 403 });
    }

    const tagihanList = await prisma.tagihan.findMany({
      where: { idTagihan: { in: idTagihanList } },
      include: { anak: { include: { rekeningTabungan: true } } },
    });

    // Orang tua hanya boleh membayar tagihan anaknya sendiri.
    if (!PETUGAS.has(sesi.peran)) {
      const milikSendiri = tagihanList.every((t) => (t as any).anak?.idKeluarga === sesi.id);
      if (!milikSendiri) {
        return NextResponse.json({ success: false, error: "Tagihan bukan milik keluarga Anda." }, { status: 403 });
      }
    }

    const results: any[] = [];

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
        pembayaranData.diverifikasiOleh = sesi.nama;
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
          data: { idTabungan: rekening.idTabungan, jenis: "BAYAR_SPP", nominal: totalBayar, dicatatOleh: sesi.nama },
        });
        newStatus = "LUNAS";
        pembayaranData.diverifikasiOleh = sesi.nama;
      } else {
        results.push({ idTagihan: tagihan.idTagihan, status: "GAGAL", error: "Metode tidak valid", nominal: totalBayar });
        continue;
      }

      const pembayaran = await prisma.pembayaran.create({ data: pembayaranData });
      await prisma.tagihan.update({ where: { idTagihan: tagihan.idTagihan }, data: { status: newStatus as any } });

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
    return NextResponse.json({ success: false, error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
