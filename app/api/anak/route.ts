import { NextResponse } from "next/server";
import { prisma, KELUARGA_AMAN } from "@/lib/prisma";
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
      include: { keluarga: { select: KELUARGA_AMAN }, rekeningTabungan: true, berkasAnak: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data: anak });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}

// PATCH /api/anak -> koreksi data siswa (staf saja)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi) return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    if (sesi.peran === "ORANG_TUA") {
      return NextResponse.json({ success: false, error: "Peran tidak berwenang." }, { status: 403 });
    }

    const { idAnak, nama, tglLahir, jenisKelamin, status } = await request.json();
    if (!idAnak) return NextResponse.json({ success: false, error: "idAnak wajib diisi." }, { status: 400 });

    const anak = await prisma.anak.findUnique({ where: { idAnak } });
    if (!anak) return NextResponse.json({ success: false, error: "Siswa tidak ditemukan." }, { status: 404 });

    if (status && !["AKTIF", "PENDAFTAR"].includes(status)) {
      return NextResponse.json({ success: false, error: "Status harus AKTIF atau PENDAFTAR." }, { status: 400 });
    }

    const updated = await prisma.anak.update({
      where: { idAnak },
      data: {
        nama: nama ? String(nama).trim() : undefined,
        tglLahir: tglLahir ? new Date(tglLahir) : undefined,
        jenisKelamin: jenisKelamin === "P" || jenisKelamin === "L" ? jenisKelamin : undefined,
        status: status || undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "Data siswa diperbarui." });
  } catch (error: any) {
    console.error("API Anak PATCH Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}

// DELETE /api/anak?idAnak=... -> hapus siswa (kepala sekolah saja)
export async function DELETE(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== "KEPALA_SEKOLAH") {
      return NextResponse.json({ success: false, error: "Peran tidak berwenang." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idAnak = searchParams.get("idAnak");
    if (!idAnak) return NextResponse.json({ success: false, error: "idAnak wajib diisi." }, { status: 400 });

    const anak = await prisma.anak.findUnique({ where: { idAnak } });
    if (!anak) return NextResponse.json({ success: false, error: "Siswa tidak ditemukan." }, { status: 404 });

    await prisma.anak.delete({ where: { idAnak } });
    return NextResponse.json({ success: true, message: `Data ${anak.nama} dihapus.` });
  } catch (error: any) {
    console.error("API Anak DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan server." }, { status: 500 });
  }
}
