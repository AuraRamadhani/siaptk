/**
 * Usia dalam tahun penuh pada tanggal acuan.
 * Dipakai pengelompokan otomatis saat pendaftaran dan pengelompokan ulang tahun ajaran.
 */
export function hitungUsia(tglLahir: Date, acuan = TANGGAL_ACUAN_PPDB): number {
  let usia = acuan.getFullYear() - tglLahir.getFullYear();
  const bulan = acuan.getMonth() - tglLahir.getMonth();
  if (bulan < 0 || (bulan === 0 && acuan.getDate() < tglLahir.getDate())) usia--;
  return usia;
}

/** Tanggal acuan perhitungan usia tahun ajaran 2026/2027 (1 Juli 2026). */
export const TANGGAL_ACUAN_PPDB = new Date(2026, 6, 1);

/** Rentang usia yang diterima sistem: KB (3-4), TK A (4-5), TK B (5-6). */
export const USIA_MIN = 3;
export const USIA_MAX = 6;

export interface InfoKelompokUsia {
  kode: 'KB' | 'TK A' | 'TK B';
  nama: string;
  labelLengkap: string;
  rentang: string;
  usiaMin: number;
  usiaMaks: number;
  usia: number;
}

/**
 * Menentukan kelompok anak secara otomatis berdasarkan tanggal lahir:
 * - KB (Kelompok Bermain): 3-4 tahun (usia 3 tahun)
 * - TK A: 4-5 tahun (usia 4 tahun)
 * - TK B: 5-6 tahun (usia 5-6 tahun)
 */
export function tentukanKelompokDariTglLahir(
  tglLahir: Date | string,
  acuan = TANGGAL_ACUAN_PPDB
): InfoKelompokUsia | null {
  if (!tglLahir) return null;
  const lahir = typeof tglLahir === 'string' ? new Date(tglLahir) : tglLahir;
  if (Number.isNaN(lahir.getTime())) return null;

  const usia = hitungUsia(lahir, acuan);

  if (usia >= 5 && usia <= 6) {
    return {
      kode: 'TK B',
      nama: 'TK B',
      labelLengkap: 'Kelompok B (TK B) - Usia 5-6 Tahun',
      rentang: '5-6 tahun',
      usiaMin: 5,
      usiaMaks: 6,
      usia,
    };
  }
  if (usia === 4) {
    return {
      kode: 'TK A',
      nama: 'TK A',
      labelLengkap: 'Kelompok A (TK A) - Usia 4-5 Tahun',
      rentang: '4-5 tahun',
      usiaMin: 4,
      usiaMaks: 5,
      usia,
    };
  }
  if (usia === 3) {
    return {
      kode: 'KB',
      nama: 'Kelompok Bermain (KB)',
      labelLengkap: 'Kelompok Bermain (KB) - Usia 3-4 Tahun',
      rentang: '3-4 tahun',
      usiaMin: 3,
      usiaMaks: 4,
      usia,
    };
  }
  return null;
}
