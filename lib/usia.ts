/**
 * Usia dalam tahun penuh pada tanggal acuan.
 * Dipakai pengelompokan otomatis dan pengelompokan ulang tahun ajaran.
 */
export function hitungUsia(tglLahir: Date, acuan = new Date()): number {
  let usia = acuan.getFullYear() - tglLahir.getFullYear();
  const bulan = acuan.getMonth() - tglLahir.getMonth();
  if (bulan < 0 || (bulan === 0 && acuan.getDate() < tglLahir.getDate())) usia--;
  return usia;
}

/** Rentang usia yang diterima sistem (TK). */
export const USIA_MIN = 4;
export const USIA_MAX = 6;
