'use client';

import React, { useEffect, useState } from 'react';

type Kelompok = {
  idKelompok: string;
  nama: string;
  usiaMin: number;
  usiaMaks: number;
  riwayatKelompok: { idRiwayat: string; anak: { idAnak: string; nama: string; nik: string } }[];
};

type Hasil = {
  tahunAjaran: { periode: string };
  kelompok: Kelompok[];
  belumKelompok: { idAnak: string; nama: string; nik: string }[];
};

export default function PanelKelompok() {
  const [data, setData] = useState<Hasil | null>(null);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);

  const muat = async () => {
    const res = await fetch('/api/pengelompokan').then((x) => x.json());
    if (res.success) setData(res.data);
    else setPesan(res.error);
    setLoading(false);
  };

  useEffect(() => {
    // setState terjadi setelah await, bukan sinkron di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, []);

  const jalankan = async () => {
    const res = await fetch('/api/pengelompokan', { method: 'POST' }).then((x) => x.json());
    if (res.success) {
      const g = res.data.gagal as { nama: string; alasan: string }[];
      setPesan(
        res.message + (g.length > 0 ? ' Gagal: ' + g.map((x) => `${x.nama} (${x.alasan})`).join('; ') : '')
      );
      muat();
    } else {
      setPesan(res.error);
    }
  };

  const keluarkan = async (idRiwayat: string, nama: string) => {
    if (!confirm(`Keluarkan ${nama} dari kelompok?`)) return;
    const res = await fetch(`/api/pengelompokan?idRiwayat=${encodeURIComponent(idRiwayat)}`, {
      method: 'DELETE',
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) muat();
  };

  if (loading && !data) return <div className="p-6 text-xs text-slate-500">Memuat…</div>;

  return (
    <div className="space-y-6">
      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pengelompokan Otomatis</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tahun ajaran aktif: <strong>{data?.tahunAjaran?.periode ?? '-'}</strong> ·{' '}
              {data?.belumKelompok.length ?? 0} siswa belum masuk kelompok.
            </p>
          </div>
          <button
            onClick={jalankan}
            disabled={(data?.belumKelompok.length ?? 0) === 0}
            className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Kelompokkan Sekarang
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Siswa AKTIF yang belum punya riwayat kelompok tahun ini akan dimasukkan otomatis sesuai usia (4–6 tahun).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {(data?.kelompok || []).map((k) => (
          <div key={k.idKelompok} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {k.nama} <span className="text-xs font-normal text-slate-500">({k.usiaMin}–{k.usiaMaks} th)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">{k.riwayatKelompok.length} siswa.</p>
            </div>
            {k.riwayatKelompok.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada siswa.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {k.riwayatKelompok.map((r) => (
                  <li key={r.idRiwayat} className="px-6 py-2.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{r.anak.nama}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-500">{r.anak.nik}</span>
                      <button
                        onClick={() => keluarkan(r.idRiwayat, r.anak.nama)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Keluarkan
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {(data?.belumKelompok.length ?? 0) > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="text-sm font-bold text-amber-900">Belum Dikelompokkan</h3>
            <p className="text-xs text-amber-700 mt-1">{data?.belumKelompok.length} siswa menunggu.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data?.belumKelompok.map((a) => (
              <li key={a.idAnak} className="px-6 py-2.5 flex justify-between text-xs">
                <span className="font-semibold text-slate-800">{a.nama}</span>
                <span className="text-slate-500">{a.nik}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
