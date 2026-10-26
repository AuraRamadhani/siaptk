import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idAnak = searchParams.get("idAnak");
    const idKeluarga = searchParams.get("idKeluarga");
    const status = searchParams.get("status");

    const where: any = {};
    if (idAnak) where.idAnak = idAnak;
    if (status) where.status = status;
    if (idKeluarga) {
      where.anak = { idKeluarga };
    }

    const tagihan = await prisma.tagihan.findMany({
      where,
      include: {
        anak: {
          include: { keluarga: true },
        },
        pembayaran: true,
      },
      orderBy: { bulan: "desc" },
    });

    const data = tagihan.map((t: any) => ({
      ...t,
      nominal: Number(t.nominal),
      diskon: Number(t.diskon),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idAnak, jenis, bulan, nominal, diskon } = body;

    if (!idAnak || !jenis || !nominal) {
      return NextResponse.json({ success: false, error: "idAnak, jenis, dan nominal wajib diisi" }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.create({
      data: {
        idAnak,
        jenis,
        bulan: bulan ? Number(bulan) : null,
        nominal: Number(nominal),
        diskon: diskon ? Number(diskon) : 0,
        status: "BELUM_BAYAR",
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...tagihan, nominal: Number((tagihan as any).nominal), diskon: Number((tagihan as any).diskon) },
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
