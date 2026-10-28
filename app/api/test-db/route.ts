import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.keluarga.count();

    return NextResponse.json({
      success: true,
      message: "Koneksi MySQL dan query tabel keluarga berhasil!",
      count,
    });
  } catch (error) {
    console.error("Database query error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengakses tabel keluarga.",
      },
      { status: 500 },
    );
  }
}
