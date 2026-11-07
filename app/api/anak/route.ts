import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idKeluarga = searchParams.get("idKeluarga");

    // Orang tua hanya bisa lihat anak sendiri; petugas bisa lihat semua dengan filter opsional.
    const where: any = {};
    if (sesi.peran === "ORANG_TUA") {
      where.idKeluarga = sesi.id;
    } else if (idKeluarga) {
      where.idKeluarga = idKeluarga;
    }

    const anak = await prisma.anak.findMany({
      where,
      include: { keluarga: true, rekeningTabungan: true, berkasAnak: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data: anak });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
