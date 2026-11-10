'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, X } from 'lucide-react';
import logoSIAPTK from '@/app/assets/siap-tk-logo.png';
import { useToast } from '@/components/Toast';

// Header portal staf (Guru, Bendahara, Kepala Sekolah, Super Admin)
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
  const { toast } = useToast();

  const [bukaGantiSandi, setBukaGantiSandi] = useState(false);
  const [sandiLama, setSandiLama] = useState('');
  const [sandiBaru, setSandiBaru] = useState('');
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('');
  const [showLama, setShowLama] = useState(false);
  const [showBaru, setShowBaru] = useState(false);
  const [showKonf, setShowKonf] = useState(false);
  const [memuat, setMemuat] = useState(false);

  const keluar = async () => {
    await fetch('/api/auth/keluar', { method: 'POST' });
    router.push('/masuk/orang-tua');
    router.refresh();
  };

  const tutupModal = () => {
    setBukaGantiSandi(false);
    setSandiLama('');
    setSandiBaru('');
    setKonfirmasiSandi('');
    setShowLama(false);
    setShowBaru(false);
    setShowKonf(false);
  };

  const simpanKataSandi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandiLama || !sandiBaru) {
      toast.warning('Kata sandi lama dan baru wajib diisi.');
      return;
    }
    if (sandiBaru.length < 6) {
      toast.warning('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (sandiBaru !== konfirmasiSandi) {
      toast.error('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setMemuat(true);
    try {
      const res = await fetch('/api/auth/ganti-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kataSandiLama: sandiLama,
          kataSandiBaru: sandiBaru,
        }),
      }).then((r) => r.json());

      if (res.success) {
        toast.success(res.message || 'Kata sandi berhasil diperbarui.');
        tutupModal();
      } else {
        toast.error(res.error || 'Gagal mengganti kata sandi.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setMemuat(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#095c51] text-white shadow-md w-full">
        <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between gap-3">
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

          <div className="flex items-center space-x-3">
            <div className="bg-white text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] flex items-center justify-center text-[10px] font-bold">
                {inisial}
              </span>
              <span className="hidden sm:inline">{nama}</span>
            </div>

            <button
              type="button"
              onClick={() => setBukaGantiSandi(true)}
              className="text-xs px-3.5 py-2.5 rounded-xl bg-teal-800/80 hover:bg-teal-700 border border-teal-600/60 text-white transition cursor-pointer font-bold shadow-sm inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti Sandi</span>
            </button>

            <button
              onClick={keluar}
              className="text-xs px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-bold shadow-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Modal Ganti Kata Sandi */}
      {bukaGantiSandi && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={simpanKataSandi}
            className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl border border-slate-100 space-y-5 text-slate-800"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Ganti Kata Sandi</h2>
                <p className="text-xs text-slate-500 mt-0.5">{nama}</p>
              </div>
              <button
                type="button"
                onClick={tutupModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Lama</label>
                <div className="relative">
                  <input
                    type={showLama ? 'text' : 'password'}
                    value={sandiLama}
                    onChange={(e) => setSandiLama(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini"
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLama(!showLama)}
                    aria-label={showLama ? 'Sembunyikan kata sandi lama' : 'Tampilkan kata sandi lama'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                  >
                    {showLama ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showBaru ? 'text' : 'password'}
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBaru(!showBaru)}
                    aria-label={showBaru ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                  >
                    {showBaru ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showKonf ? 'text' : 'password'}
                    value={konfirmasiSandi}
                    onChange={(e) => setKonfirmasiSandi(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKonf(!showKonf)}
                    aria-label={showKonf ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                  >
                    {showKonf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={tutupModal}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={memuat}
                className="px-5 py-2.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {memuat ? 'Menyimpan...' : 'Simpan Kata Sandi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
