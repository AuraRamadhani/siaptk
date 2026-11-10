'use client';

import React, { useState } from 'react';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';

type AnakForm = { nama: string; nik: string; tglLahir: string; jenisKelamin: string };

const kosong: AnakForm = { nama: '', nik: '', tglLahir: '', jenisKelamin: 'L' };

export default function PanelPendaftaranAdmin({ onSukses }: { onSukses?: () => void }) {
  const [keluarga, setKeluarga] = useState({ namaAyah: '', namaIbu: '', noHp: '', email: '', alamat: '' });
  const [anak, setAnak] = useState<AnakForm[]>([{ ...kosong }]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);

  const ubahAnak = (i: number, patch: Partial<AnakForm>) => {
    setAnak((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/pendaftaran/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...keluarga, anak }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) {
      setKeluarga({ namaAyah: '', namaIbu: '', noHp: '', email: '', alamat: '' });
      setAnak([{ ...kosong }]);
      onSukses?.();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={kirim} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Input Pendaftaran Langsung (Onsite)</h2>
        <p className="text-xs text-slate-500 mt-1">Daftarkan calon siswa yang datang langsung ke kantor.</p>
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-600">Nama ayah</span>
          <input
            value={keluarga.namaAyah}
            onChange={(e) => setKeluarga({ ...keluarga, namaAyah: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-600">Nama ibu</span>
          <input
            value={keluarga.namaIbu}
            onChange={(e) => setKeluarga({ ...keluarga, namaIbu: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-600">No. HP *</span>
          <input
            required
            value={keluarga.noHp}
            onChange={(e) => setKeluarga({ ...keluarga, noHp: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            placeholder="08xxxxxxxxxx"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-600">Email (opsional)</span>
          <input
            type="email"
            value={keluarga.email}
            onChange={(e) => setKeluarga({ ...keluarga, email: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
          />
        </label>
        <label className="text-xs space-y-1 md:col-span-2">
          <span className="font-semibold text-slate-600">Alamat</span>
          <input
            value={keluarga.alamat}
            onChange={(e) => setKeluarga({ ...keluarga, alamat: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Data Anak</h3>
          <button
            type="button"
            onClick={() => setAnak((p) => [...p, { ...kosong }])}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
          >
            + Tambah Anak
          </button>
        </div>
        {anak.map((a, i) => {
          const infoKelompok = a.tglLahir ? tentukanKelompokDariTglLahir(a.tglLahir) : null;
          return (
          <div key={i} className="space-y-2 border border-slate-100 rounded-2xl p-3">
          <div className="grid md:grid-cols-5 gap-3">
            <label className="text-xs space-y-1 md:col-span-2">
              <span className="font-semibold text-slate-600">Nama anak *</span>
              <input
                required
                value={a.nama}
                onChange={(e) => ubahAnak(i, { nama: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">NIK (16 digit) *</span>
              <input
                required
                maxLength={16}
                inputMode="numeric"
                pattern="\d{16}"
                title="Tepat 16 digit angka"
                value={a.nik}
                onChange={(e) => ubahAnak(i, { nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                placeholder="16 digit"
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Tgl lahir *</span>
              <input
                required
                type="date"
                value={a.tglLahir}
                onChange={(e) => ubahAnak(i, { tglLahir: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </label>
            <div className="flex gap-2 items-end">
              <label className="text-xs space-y-1 flex-1">
                <span className="font-semibold text-slate-600">L/P</span>
                <select
                  value={a.jenisKelamin}
                  onChange={(e) => ubahAnak(i, { jenisKelamin: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="L">L</option>
                  <option value="P">P</option>
                </select>
              </label>
              {anak.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAnak((p) => p.filter((_, idx) => idx !== i))}
                  className="px-2 py-2 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
          {a.tglLahir && (
            <div className={`text-[11px] px-3 py-1.5 rounded-xl font-semibold ${infoKelompok ? 'bg-teal-50 text-[#095c51]' : 'bg-amber-50 text-amber-800'}`}>
              {infoKelompok
                ? `Kelompok Otomatis: ${infoKelompok.labelLengkap} (Usia ${infoKelompok.usia} tahun)`
                : 'Usia di luar rentang standar KB/TK (3-6 tahun)'}
            </div>
          )}
          </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
      >
        {loading ? 'Menyimpan…' : 'Daftarkan'}
      </button>
    </form>
  );
}
