import type { Prisma, PrismaClient } from '@/app/generated/prisma/client';
import { hitungUsia } from '@/lib/usia';

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Status siswa yang sudah tidak aktif mengikuti kegiatan belajar. */
export const STATUS_KELUAR = ['LULUS', 'BERHENTI', 'PINDAH'] as const;
export type StatusKeluar = (typeof STATUS_KELUAR)[number];

/** Label bahasa Indonesia untuk status siswa. */
export const LABEL_STATUS: Record<string, string> = {
  PENDAFTAR: 'Pendaftar',
  AKTIF: 'Aktif',
  LULUS: 'Lulus',
  BERHENTI: 'Berhenti',
  PINDAH: 'Pindah',
};

/**
 * Tanggal acuan hitung usia untuk sebuah tahun ajaran.
 * Urutan: tanggal_acuan tersimpan → 1 Juli tahun awal periode → acuan bawaan.
 */
export function acuanTahunAjaran(
  tahun: { periode?: string | null; tanggalAcuan?: Date | string | null } | null | undefined,
  bawaan: Date
): Date {
  if (tahun?.tanggalAcuan) {
    const t = new Date(tahun.tanggalAcuan);
    if (!Number.isNaN(t.getTime())) return t;
  }
  // periode berbentuk "2027/2028" -> acuan 1 Juli 2027.
  const tahunAwal = Number(String(tahun?.periode || '').slice(0, 4));
  if (Number.isInteger(tahunAwal) && tahunAwal > 2000) {
    return new Date(tahunAwal, 6, 1);
  }
  return bawaan;
}

/** Periode berikutnya dari "2026/2027" -> "2027/2028". */
export function periodeBerikutnya(periode: string): string | null {
  const cocok = String(periode || '').match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!cocok) return null;
  const awal = Number(cocok[1]);
  const akhir = Number(cocok[2]);
  if (akhir !== awal + 1) return null;
  return `${awal + 1}/${akhir + 1}`;
}

type KelompokRingkas = { idKelompok: string; nama: string; usiaMin: number; usiaMaks: number };

export type BarisPratinjau = {
  idAnak: string;
  nama: string;
  nik: string;
  usia: number;
  kelompokLama: string | null;
  kelompokBaru: string | null;
  hasil: 'NAIK' | 'TETAP' | 'LULUS' | 'GAGAL';
  alasan?: string;
};

/**
 * Hitung rencana kenaikan kelompok untuk satu tahun ajaran, tanpa menyimpan apa pun.
 * Dipakai untuk pratinjau sebelum kepala sekolah menekan tombol proses.
 */
export async function rencanaKenaikan(
  db: DbClient,
  opsi: {
    idTahunAjaran: string;
    acuan: Date;
    usiaMin: number;
    usiaMaks: number;
    /** Kelompok tujuan untuk anak yang melewati batas usia tertinggi. */
    kelompok?: KelompokRingkas[];
    /** Fungsi penentu kelompok dari tanggal lahir. */
    tentukan: (tglLahir: Date | string, acuan: Date) => { kode: string } | null;
  }
): Promise<BarisPratinjau[]> {
  const { idTahunAjaran, acuan, usiaMin, usiaMaks, tentukan } = opsi;
  const kelompok = opsi.kelompok ?? (await db.kelompok.findMany({ orderBy: { usiaMin: 'asc' } }));

  const siswa = await db.anak.findMany({
    where: { status: 'AKTIF' },
    orderBy: { nama: 'asc' },
    include: {
      riwayatKelompok: {
        include: { kelompok: true, tahunAjaran: true },
        orderBy: { tahunAjaran: { periode: 'desc' } },
      },
    },
  });

  const hasil: BarisPratinjau[] = [];

  for (const anak of siswa) {
    const lahir = new Date(anak.tglLahir);
    const usia = hitungUsia(lahir, acuan);
    const riwayatTahunIni = anak.riwayatKelompok.find((r) => r.idTahunAjaran === idTahunAjaran);
    const riwayatTerakhir = anak.riwayatKelompok[0] ?? null;
    const kelompokLama = riwayatTerakhir?.kelompok?.nama ?? null;

    // Sudah punya kelompok di tahun ajaran ini -> tidak diproses ulang.
    if (riwayatTahunIni) {
      hasil.push({
        idAnak: anak.idAnak, nama: anak.nama, nik: anak.nik, usia,
        kelompokLama: riwayatTahunIni.kelompok?.nama ?? null,
        kelompokBaru: riwayatTahunIni.kelompok?.nama ?? null,
        hasil: 'TETAP', alasan: 'Sudah dikelompokkan pada tahun ajaran ini',
      });
      continue;
    }

    if (usia > usiaMaks) {
      hasil.push({
        idAnak: anak.idAnak, nama: anak.nama, nik: anak.nik, usia,
        kelompokLama, kelompokBaru: null, hasil: 'LULUS',
        alasan: `Usia ${usia} tahun melewati batas TK B (${usiaMaks} tahun)`,
      });
      continue;
    }

    if (usia < usiaMin) {
      hasil.push({
        idAnak: anak.idAnak, nama: anak.nama, nik: anak.nik, usia,
        kelompokLama, kelompokBaru: null, hasil: 'GAGAL',
        alasan: `Usia ${usia} tahun, di bawah batas minimal ${usiaMin} tahun`,
      });
      continue;
    }

    const info = tentukan(lahir, acuan);
    const cocok =
      (info && kelompok.find((k) => k.nama === info.kode)) ||
      kelompok.find((k) => usia >= k.usiaMin && usia <= k.usiaMaks);

    if (!cocok) {
      hasil.push({
        idAnak: anak.idAnak, nama: anak.nama, nik: anak.nik, usia,
        kelompokLama, kelompokBaru: null, hasil: 'GAGAL',
        alasan: `Tidak ada kelompok untuk usia ${usia} tahun`,
      });
      continue;
    }

    hasil.push({
      idAnak: anak.idAnak,
      nama: anak.nama,
      nik: anak.nik,
      usia,
      kelompokLama,
      kelompokBaru: cocok.nama,
      hasil: kelompokLama === cocok.nama ? 'TETAP' : 'NAIK',
    });
  }

  return hasil;
}
