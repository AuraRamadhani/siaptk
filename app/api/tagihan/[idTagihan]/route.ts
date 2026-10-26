import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const { idTagihan } = await params;
    const tagihan = await prisma.tagihan.findUnique({
      where: { idTagihan },
      include: {
        anak: { include: { keluarga: true, rekeningTabungan: true } },
        pembayaran: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    const data = {
      ...tagihan,
      nominal: Number((tagihan as any).nominal),
      diskon: Number((tagihan as any).diskon),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const { idTagihan } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "status wajib diisi" }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.update({
      where: { idTagihan },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: { ...tagihan, nominal: Number((tagihan as any).nominal), diskon: Number((tagihan as any).diskon) },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const { idTagihan } = await params;
    const tagihan = await prisma.tagihan.update({
      where: { idTagihan },
      data: { status: "DIBATALKAN" },
    });

    return NextResponse.json({
      success: true,
      data: { ...tagihan, nominal: Number((tagihan as any).nominal), diskon: Number((tagihan as any).diskon) },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
