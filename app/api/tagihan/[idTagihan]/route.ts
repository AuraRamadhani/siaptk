import { NextResponse } from "next/server";
import type { StatusTagihan } from "@/app/generated/prisma/client";
import { prisma, KELUARGA_AMAN } from "@/lib/prisma";
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
        anak: { include: { keluarga: { select: KELUARGA_AMAN }, rekeningTabungan: true } },
        pembayaran: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    // Orang tua hanya lihat tagihan anak sendiri.
    if (sesi.peran === "ORANG_TUA" && tagihan.anak?.idKeluarga !== sesi.id) {
      return NextResponse.json({ success: false, error: "Tagihan bukan milik keluarga Anda." }, { status: 403 });
    }

    const data = {
      ...tagihan,
      nominal: Number(tagihan.nominal),
      diskon: Number(tagihan.diskon),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
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
    const { status, nominal, diskon } = body;

    if (status !== undefined && !["BELUM_BAYAR", "MENUNGGU_VERIFIKASI", "LUNAS", "DIBATALKAN"].includes(status)) {
      return NextResponse.json({ success: false, error: "status tidak valid" }, { status: 400 });
    }

    // Status menunggu verifikasi hanya boleh lahir dari pembayaran yang benar-benar
    // dicatat. Bila diubah langsung, bendahara melihat antrean tanpa bukti dan
    // tombol Verifikasi/Tolak tidak pernah muncul.
    if (status === "MENUNGGU_VERIFIKASI") {
      const adaBayar = await prisma.pembayaran.count({ where: { idTagihan } });
      if (adaBayar === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Status menunggu verifikasi hanya dapat terbentuk dari pembayaran yang dicatat. Gunakan LUNAS atau BELUM_BAYAR.",
          },
          { status: 409 }
        );
      }
    }

    const ubah: { status?: StatusTagihan; nominal?: number; diskon?: number } = {};
    if (status !== undefined) ubah.status = status;
    if (nominal !== undefined) {
      if (!(Number(nominal) > 0)) {
        return NextResponse.json({ success: false, error: "nominal harus lebih dari 0" }, { status: 400 });
      }
      ubah.nominal = Number(nominal);
    }
    if (diskon !== undefined) ubah.diskon = Number(diskon);
    if (Object.keys(ubah).length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada data yang diubah." }, { status: 400 });
    }

    const ada = await prisma.tagihan.findUnique({ where: { idTagihan }, select: { idTagihan: true } });
    if (!ada) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan." }, { status: 404 });
    }

    const tagihan = await prisma.tagihan.update({
      where: { idTagihan },
      data: ubah,
    });

    return NextResponse.json({
      success: true,
      data: { ...tagihan, nominal: Number(tagihan.nominal), diskon: Number(tagihan.diskon) },
    });
  } catch (error) {
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
    const ada = await prisma.tagihan.findUnique({ where: { idTagihan }, select: { idTagihan: true } });
    if (!ada) {
      return NextResponse.json({ success: false, error: "Tagihan tidak ditemukan." }, { status: 404 });
    }

    const tagihan = await prisma.tagihan.update({
      where: { idTagihan },
      data: { status: "DIBATALKAN" },
    });

    return NextResponse.json({
      success: true,
      data: { ...tagihan, nominal: Number(tagihan.nominal), diskon: Number(tagihan.diskon) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
