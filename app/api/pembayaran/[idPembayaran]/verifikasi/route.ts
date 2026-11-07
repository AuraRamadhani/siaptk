import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idPembayaran: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Hanya bendahara yang dapat memverifikasi." }, { status: 403 });
    }

    const { idPembayaran } = await params;
    const body = await request.json();
    const { aksi } = body;

    if (!["verifikasi", "tolak"].includes(aksi)) {
      return NextResponse.json({ success: false, error: "aksi harus 'verifikasi' atau 'tolak'" }, { status: 400 });
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { idPembayaran },
      include: { tagihan: true },
    });

    if (!pembayaran) {
      return NextResponse.json({ success: false, error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    const idTagihan = pembayaran.idTagihan;

    if (aksi === "verifikasi") {
      const [updatedPembayaran] = await prisma.$transaction([
        prisma.pembayaran.update({
          where: { idPembayaran },
          data: { diverifikasiOleh: sesi.nama },
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
