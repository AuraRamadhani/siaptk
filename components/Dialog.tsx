'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * Dialog konfirmasi & pemberitahuan bergaya aplikasi.
 * Dipakai menggantikan window.confirm / window.alert bawaan peramban,
 * yang judulnya menampilkan alamat situs (mis. "localhost:3000 says").
 */

export type DialogTipe = 'warning' | 'danger' | 'info' | 'success';

type Permintaan = {
  judul: string;
  pesan: string;
  tipe: DialogTipe;
  labelOk: string;
  labelBatal: string | null; // null = hanya tombol OK (pemberitahuan)
  selesaikan: (hasil: boolean) => void;
};

type KonfirmasiOpsi = {
  judul?: string;
  pesan: string;
  tipe?: DialogTipe;
  labelOk?: string;
  labelBatal?: string;
};

interface DialogContextValue {
  konfirmasi: (opsi: KonfirmasiOpsi | string) => Promise<boolean>;
  beritahu: (pesan: string, opsi?: Omit<KonfirmasiOpsi, 'pesan'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const GAYA: Record<DialogTipe, { ikon: React.ReactNode; tombol: string; cincin: string }> = {
  warning: {
    ikon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    tombol: 'bg-amber-600 hover:bg-amber-700',
    cincin: 'bg-amber-50 border-amber-200',
  },
  danger: {
    ikon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
    tombol: 'bg-rose-600 hover:bg-rose-700',
    cincin: 'bg-rose-50 border-rose-200',
  },
  info: {
    ikon: <Info className="w-5 h-5 text-[#095c51]" />,
    tombol: 'bg-[#095c51] hover:bg-[#074840]',
    cincin: 'bg-teal-50 border-teal-200',
  },
  success: {
    ikon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    tombol: 'bg-emerald-600 hover:bg-emerald-700',
    cincin: 'bg-emerald-50 border-emerald-200',
  },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [permintaan, setPermintaan] = useState<Permintaan | null>(null);

  const buka = useCallback((p: Permintaan) => setPermintaan(p), []);

  // Selesaikan memakai keadaan terkini dari state, bukan ref saat render.
  const selesaikan = useCallback((hasil: boolean) => {
    setPermintaan((aktif) => {
      aktif?.selesaikan(hasil);
      return null;
    });
  }, []);

  const konfirmasi = useCallback(
    (opsi: KonfirmasiOpsi | string) =>
      new Promise<boolean>((resolve) => {
        const o = typeof opsi === 'string' ? { pesan: opsi } : opsi;
        buka({
          judul: o.judul ?? 'Konfirmasi',
          pesan: o.pesan,
          tipe: o.tipe ?? 'warning',
          labelOk: o.labelOk ?? 'Lanjutkan',
          labelBatal: o.labelBatal ?? 'Batal',
          selesaikan: resolve,
        });
      }),
    [buka]
  );

  const beritahu = useCallback(
    (pesan: string, opsi?: Omit<KonfirmasiOpsi, 'pesan'>) =>
      new Promise<void>((resolve) => {
        buka({
          judul: opsi?.judul ?? 'Pemberitahuan',
          pesan,
          tipe: opsi?.tipe ?? 'info',
          labelOk: opsi?.labelOk ?? 'Mengerti',
          labelBatal: null,
          selesaikan: () => resolve(),
        });
      }),
    [buka]
  );

  const gaya = permintaan ? GAYA[permintaan.tipe] : GAYA.info;

  return (
    <DialogContext.Provider value={{ konfirmasi, beritahu }}>
      {children}
      {permintaan && (
        <div
          className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) selesaikan(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') selesaikan(false);
            if (e.key === 'Enter') selesaikan(true);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-judul"
            aria-describedby="dialog-pesan"
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${gaya.cincin}`}>
                  {gaya.ikon}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="dialog-judul" className="text-base font-bold text-slate-900">
                    {permintaan.judul}
                  </h2>
                  <p
                    id="dialog-pesan"
                    className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap break-words leading-relaxed"
                  >
                    {permintaan.pesan}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selesaikan(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                {permintaan.labelBatal && (
                  <button
                    type="button"
                    onClick={() => selesaikan(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {permintaan.labelBatal}
                  </button>
                )}
                <button
                  type="button"
                  autoFocus
                  onClick={() => selesaikan(true)}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs ${gaya.tombol}`}
                >
                  {permintaan.labelOk}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog harus digunakan di dalam DialogProvider');
  }
  return ctx;
}
