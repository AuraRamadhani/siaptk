'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import logoSIAPTK from '@/app/assets/siap-tk-logo.png';

// Header portal staf — disamakan dengan header PortalOrangTua pada prototipe.
export default function BilahAtas({
  judul,
  nama,
  inisial,
}: {
  judul: string;
  nama: string;
  inisial: string;
}) {
  const router = useRouter();

  const keluar = async () => {
    await fetch('/api/auth/keluar', { method: 'POST' });
    router.push('/masuk/orang-tua');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#095c51] text-white shadow-md w-full">
      <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={logoSIAPTK.src}
            alt="Logo SIAP TK"
            className="w-11 h-11 object-contain rounded-xl bg-white p-1 shadow-sm"
          />
          <div>
            <span className="font-bold text-lg text-white tracking-wide">SIAP TK</span>
            <p className="text-xs text-teal-200">TK Islam Nur Habib — {judul}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-white text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] flex items-center justify-center text-[10px] font-bold">
              {inisial}
            </span>
            <span className="hidden sm:inline">{nama}</span>
          </div>

          <button
            onClick={keluar}
            className="text-xs px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-bold shadow-sm"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
