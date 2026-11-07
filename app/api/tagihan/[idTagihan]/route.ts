import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

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

    // Orang tua hanya lihat tagihan anak sendiri.
    if (sesi.peran === "ORANG_TUA" && (tagihan as any).anak?.idKeluarga !== sesi.id) {
      return NextResponse.json({ success: false, error: "Tagihan bukan milik keluarga Anda." }, { status: 403 });
    }

    const data = {
      ...tagihan,
      nominal: Number((tagihan as any).nominal),
      diskon: Number((tagihan as any).diskon),
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !["BENDAHARA", "KEPALA_SEKOLAH"].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Hanya bendahara yang dapat mengubah tagihan." }, { status: 403 });
    }

    const { idTagihan } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["BELUM_BAYAR", "MENUNGGU_VERIFIKASI", "LUNAS", "DIBATALKAN"].includes(status)) {
      return NextResponse.json({ success: false, error: "status tidak valid" }, { status: 400 });
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
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ idTagihan: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !["BENDAHARA", "KEPALA_SEKOLAH"].includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Hanya bendahara yang dapat membatalkan tagihan." }, { status: 403 });
    }

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
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
