import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';

export type RekeningBankItem = {
  id: string;
  bank: string;
  nomorRekening: string;
  atasNama: string;
};

export const DEFAULT_REKENING: RekeningBankItem[] = [
  {
    id: '1',
    bank: 'Bank Syariah Indonesia (BSI)',
    nomorRekening: '7123-4567-89',
    atasNama: 'TK Islam Nur Habib',
  },
  {
    id: '2',
    bank: 'Bank Central Asia (BCA)',
    nomorRekening: '8876-5432-10',
    atasNama: 'Yayasan Nur Habib',
  },
  {
    id: '3',
    bank: 'Bank Mandiri',
    nomorRekening: '132-00-9876543-2',
    atasNama: 'TK Islam Nur Habib',
  },
];

const KUNCI_REKENING = 'REKENING_TRANSFER_RESMI';
const PETUGAS = new Set(['BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);

// GET /api/pengaturan/rekening -> Ambil daftar rekening resmi sekolah (dapat diakses publik/orang tua/staf)
export async function GET() {
  try {
    const row = await prisma.pengaturan.findUnique({
      where: { kunci: KUNCI_REKENING },
    });

    if (row && row.nilai) {
      try {
        const parsed = JSON.parse(row.nilai);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(
            { success: true, data: parsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
          );
        }
      } catch {
        // Abaikan parse error, gunakan default
      }
    }

    return NextResponse.json(
      { success: true, data: DEFAULT_REKENING },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Gagal mengambil pengaturan rekening:', error);
    return NextResponse.json(
      { success: true, data: DEFAULT_REKENING },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

// POST /api/pengaturan/rekening -> Simpan pembaruan nomor rekening resmi oleh Bendahara/Staf
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json(
        { success: false, error: 'Hanya bendahara yang berwenang mengubah rekening sekolah.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const daftarRekening = body.rekening;

    if (!Array.isArray(daftarRekening) || daftarRekening.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Minimal harus ada 1 rekening tujuan transfer.' },
        { status: 400 }
      );
    }

    // Validasi setiap rekening
    for (const r of daftarRekening) {
      if (!r.bank?.trim() || !r.nomorRekening?.trim() || !r.atasNama?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Setiap rekening wajib memiliki nama bank, nomor rekening, dan atas nama.' },
          { status: 400 }
        );
      }
    }

    const dataTersimpan = daftarRekening.map((r, i) => ({
      id: r.id || String(i + 1),
      bank: r.bank.trim(),
      nomorRekening: r.nomorRekening.trim(),
      atasNama: r.atasNama.trim(),
    }));

    await prisma.pengaturan.upsert({
      where: { kunci: KUNCI_REKENING },
      create: {
        kunci: KUNCI_REKENING,
        nilai: JSON.stringify(dataTersimpan),
        keterangan: 'Daftar rekening bank resmi sekolah untuk transfer pembayaran',
      },
      update: {
        nilai: JSON.stringify(dataTersimpan),
      },
    });

    return NextResponse.json({
      success: true,
      data: dataTersimpan,
      message: 'Daftar rekening tujuan transfer resmi berhasil diperbarui.',
    });
  } catch (error) {
    console.error('Gagal menyimpan pengaturan rekening:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

