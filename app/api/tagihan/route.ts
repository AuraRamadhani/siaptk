import { NextResponse } from "next/server";
import { prisma, KELUARGA_AMAN } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);

export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idAnak = searchParams.get("idAnak");
    const idKeluarga = searchParams.get("idKeluarga");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (idAnak) where.idAnak = idAnak;
    if (status) where.status = status;

    // Orang tua selalu dibatasi ke keluarga sendiri.
    if (sesi.peran === "ORANG_TUA") {
      where.anak = { idKeluarga: sesi.id };
    } else if (idKeluarga) {
      where.anak = { idKeluarga };
    }

    const tagihan = await prisma.tagihan.findMany({
      where,
      include: {
        anak: {
          include: { keluarga: { select: KELUARGA_AMAN } },
        },
        pembayaran: true,
      },
      orderBy: { bulan: "desc" },
    });

    const data = tagihan.map((t: { idTagihan: string; [k: string]: unknown }) => ({
      ...t,
      nominal: Number(t.nominal),
      diskon: Number(t.diskon),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Hanya bendahara yang dapat membuat tagihan." }, { status: 403 });
    }

    const body = await request.json();
    const { idAnak, jenis, bulan, nominal, diskon } = body;

    if (!idAnak || !jenis || !nominal) {
      return NextResponse.json({ success: false, error: "idAnak, jenis, dan nominal wajib diisi" }, { status: 400 });
    }
    if (!["SPP", "PENDAFTARAN"].includes(jenis)) {
      return NextResponse.json({ success: false, error: "jenis tidak valid" }, { status: 400 });
    }
    if (!(Number(nominal) > 0)) {
      return NextResponse.json({ success: false, error: "nominal harus lebih dari 0" }, { status: 400 });
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
      data: { ...tagihan, nominal: Number(tagihan.nominal), diskon: Number(tagihan.diskon) },
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
