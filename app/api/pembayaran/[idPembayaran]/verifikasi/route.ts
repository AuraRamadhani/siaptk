import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idPembayaran: string }> }
) {
  try {
    const { idPembayaran } = await params;
    const body = await request.json();
    const { aksi, diverifikasiOleh } = body;

    if (!aksi || !["verifikasi", "tolak"].includes(aksi)) {
      return NextResponse.json({ success: false, error: "aksi harus 'verifikasi' atau 'tolak'" }, { status: 400 });
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { idPembayaran },
      include: { tagihan: true },
    });

    if (!pembayaran) {
      return NextResponse.json({ success: false, error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    const idTagihan = (pembayaran as any).idTagihan;

    if (aksi === "verifikasi") {
      const [updatedPembayaran] = await prisma.$transaction([
        prisma.pembayaran.update({
          where: { idPembayaran },
          data: { diverifikasiOleh: diverifikasiOleh || "Admin" },
        }),
        prisma.tagihan.update({
          where: { idTagihan },
          data: { status: "LUNAS" },
        }),
      ]);
      return NextResponse.json({ success: true, data: updatedPembayaran });
    } else {
      // tolak
      const [updatedPembayaran] = await prisma.$transaction([
        prisma.pembayaran.update({
          where: { idPembayaran },
          data: { buktiTransfer: null, diverifikasiOleh: null },
        }),
        prisma.tagihan.update({
          where: { idTagihan },
          data: { status: "BELUM_BAYAR" },
        }),
      ]);
      return NextResponse.json({ success: true, data: updatedPembayaran });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
