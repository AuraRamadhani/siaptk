import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idKeluarga = searchParams.get("idKeluarga");

    const where: any = {};
    if (idKeluarga) where.idKeluarga = idKeluarga;

    const anak = await prisma.anak.findMany({
      where,
      include: { keluarga: true, rekeningTabungan: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data: anak });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
