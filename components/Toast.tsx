'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastTipe = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  pesan: string;
  tipe: ToastTipe;
}

interface ToastContextValue {
  tampilkanToast: (pesan: string, tipe?: ToastTipe) => void;
  toast: {
    success: (pesan: string) => void;
    error: (pesan: string) => void;
    warning: (pesan: string) => void;
    info: (pesan: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [daftar, setDaftar] = useState<ToastItem[]>([]);

  const tutup = useCallback((id: number) => {
    setDaftar((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const tampilkanToast = useCallback(
    (pesan: string, tipe: ToastTipe = 'info') => {
      const id = nextId++;
      setDaftar((prev) => [...prev, { id, pesan, tipe }]);
      setTimeout(() => {
        tutup(id);
      }, 4000);
    },
    [tutup]
  );

  const toast = {
    success: (pesan: string) => tampilkanToast(pesan, 'success'),
    error: (pesan: string) => tampilkanToast(pesan, 'error'),
    warning: (pesan: string) => tampilkanToast(pesan, 'warning'),
    info: (pesan: string) => tampilkanToast(pesan, 'info'),
  };

  return (
    <ToastContext.Provider value={{ tampilkanToast, toast }}>
      {children}
      {/* Kontainer Toast (kanan atas, di atas modal) */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {daftar.map((item) => {
          const gaya =
            item.tipe === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : item.tipe === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : item.tipe === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-teal-50 border-teal-200 text-[#095c51]';

          const ikon =
            item.tipe === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : item.tipe === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : item.tipe === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-[#095c51] shrink-0" />
            );

          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all duration-200 ${gaya}`}
            >
              {ikon}
              <p className="text-xs font-semibold leading-relaxed flex-1">{item.pesan}</p>
              <button
                type="button"
                onClick={() => tutup(item.id)}
                aria-label="Tutup notifikasi"
                className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return ctx;
}

