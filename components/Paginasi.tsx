'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Jumlah baris per halaman yang boleh dipilih pengguna. */
export const PILIHAN_BARIS = [10, 20, 25, 50] as const;
export const BARIS_DEFAULT = 20;

/**
 * Potong daftar menjadi halaman.
 * Dipakai bersama komponen <Paginasi/> agar setiap tabel panjang punya
 * tombol halaman dan nomor halaman, bukan menggulir sampai bawah.
 */
export function usePaginasi<T>(daftar: T[], awal = BARIS_DEFAULT) {
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState<number>(awal);

  const total = daftar.length;
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const mulai = (halamanAman - 1) * perHalaman;

  const data = useMemo(
    () => daftar.slice(mulai, mulai + perHalaman),
    [daftar, mulai, perHalaman]
  );

  // Bila daftar menyusut (mis. setelah verifikasi), jangan biarkan halaman kosong.
  const gantiPerHalaman = (n: number) => {
    setPerHalaman(n);
    setHalaman(1);
  };

  return { data, halaman: halamanAman, totalHalaman, total, perHalaman, setHalaman, gantiPerHalaman, mulai };
}

type Props = {
  halaman: number;
  totalHalaman: number;
  total: number;
  perHalaman: number;
  mulai: number;
  onHalaman: (n: number) => void;
  onPerHalaman: (n: number) => void;
  satuan?: string;
};

/** Nomor halaman yang ditampilkan: 1 … sekitar halaman aktif … terakhir. */
function nomorTampil(halaman: number, totalHalaman: number): (number | '…')[] {
  if (totalHalaman <= 7) return Array.from({ length: totalHalaman }, (_, i) => i + 1);
  const hasil: (number | '…')[] = [1];
  const kiri = Math.max(2, halaman - 1);
  const kanan = Math.min(totalHalaman - 1, halaman + 1);
  if (kiri > 2) hasil.push('…');
  for (let i = kiri; i <= kanan; i++) hasil.push(i);
  if (kanan < totalHalaman - 1) hasil.push('…');
  hasil.push(totalHalaman);
  return hasil;
}

export default function Paginasi({
  halaman, totalHalaman, total, perHalaman, mulai, onHalaman, onPerHalaman, satuan = 'data',
}: Props) {
  if (total === 0) return null;

  const akhir = Math.min(mulai + perHalaman, total);
  const tombolDasar =
    'min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center border';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span>
          Menampilkan <span className="font-bold text-slate-700">{mulai + 1}</span>–
          <span className="font-bold text-slate-700">{akhir}</span> dari{' '}
          <span className="font-bold text-slate-700">{total}</span> {satuan}
        </span>
        <select
          value={perHalaman}
          onChange={(e) => onPerHalaman(Number(e.target.value))}
          className="h-8 px-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 bg-white cursor-pointer outline-none focus:border-[#095c51]"
          aria-label="Jumlah baris per halaman"
        >
          {PILIHAN_BARIS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>
      </div>

      {totalHalaman > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onHalaman(Math.max(1, halaman - 1))}
            disabled={halaman <= 1}
            aria-label="Halaman sebelumnya"
            className={`${tombolDasar} ${
              halaman <= 1
                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {nomorTampil(halaman, totalHalaman).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-1 text-xs text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onHalaman(n)}
                aria-current={n === halaman ? 'page' : undefined}
                aria-label={`Halaman ${n}`}
                className={`${tombolDasar} ${
                  n === halaman
                    ? 'border-[#095c51] bg-[#095c51] text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onHalaman(Math.min(totalHalaman, halaman + 1))}
            disabled={halaman >= totalHalaman}
            aria-label="Halaman berikutnya"
            className={`${tombolDasar} ${
              halaman >= totalHalaman
                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
