'use client';

import React, { useEffect, useState } from 'react';

type TahunAjaran = { idTahunAjaran: string; periode: string };
type Riwayat = { idRiwayat: string; kelompok: { nama: string }; tahunAjaran: { periode: string } };
type Berkas = { idBerkasAnak: string; akta: string | null; foto: string | null; kia: string | null; statusVerifikasi: string };
type Anak = {
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  status: string;
  jenisKelamin: string;
  jalurPendaftaran: string;
  keluarga: { namaAyah: string | null; namaIbu: string | null; noHp: string };
  berkasAnak: Berkas | null;
  riwayatKelompok: Riwayat[];
};

const tgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export default function PanelArsip() {
  const [data, setData] = useState<Anak[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [cari, setCari] = useState('');
  const [tahun, setTahun] = useState('');
  const [status, setStatus] = useState('');
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);

  const muat = async () => {
    const q = new URLSearchParams();
    if (cari.trim()) q.set('cari', cari.trim());
    if (tahun) q.set('tahunAjaran', tahun);
    if (status) q.set('status', status);

    const res = await fetch('/api/arsip?' + q.toString()).then((x) => x.json());
    if (res.success) {
      setData(res.data || []);
      setTahunList(res.tahunAjaranList || []);
    } else {
      setPesan(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // setState terjadi setelah await, bukan sinkron di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, []);

  const verifikasi = async (tipe: 'anak', id: string, st: string) => {
    const res = await fetch('/api/arsip', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe, id, status: st }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  return (
    <div className="space-y-6">
      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Pencarian Arsip Digital</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            muat();
          }}
          className="grid md:grid-cols-4 gap-4"
        >
          <label className="text-xs space-y-1 md:col-span-2">
            <span className="font-semibold text-slate-600">Nama / NIK / Orang tua</span>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              placeholder="Cari nama atau NIK…"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Tahun ajaran</span>
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            >
              <option value="">Semua</option>
              {tahunList.map((t) => (
                <option key={t.idTahunAjaran} value={t.idTahunAjaran}>
                  {t.periode}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            >
              <option value="">Semua</option>
              <option value="AKTIF">Aktif</option>
              <option value="PENDAFTAR">Pendaftar</option>
            </select>
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer">
              Cari
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Arsip Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">{data.length} arsip ditemukan.</p>
        </div>
        {loading ? (
          <div className="p-6 text-xs text-slate-500">Mencari…</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">Tidak ada arsip yang cocok.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Nama</th>
                <th className="text-left px-3 py-3 font-semibold">NIK</th>
                <th className="text-left px-3 py-3 font-semibold">Lahir</th>
                <th className="text-left px-3 py-3 font-semibold">Orang tua</th>
                <th className="text-left px-3 py-3 font-semibold">Kelompok</th>
                <th className="text-left px-3 py-3 font-semibold">Berkas</th>
                <th className="text-right px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.idAnak} className="border-t border-slate-100 align-top">
                  <td className="px-6 py-3 font-semibold text-slate-900">
                    {a.nama}
                    <span className="block text-[10px] font-normal text-slate-500">
                      {a.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'} · {a.jalurPendaftaran}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{a.nik}</td>
                  <td className="px-3 py-3 text-slate-600">{tgl(a.tglLahir)}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {a.keluarga?.namaAyah || '-'}
                    <span className="block text-[10px] text-slate-500">{a.keluarga?.noHp}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {a.riwayatKelompok.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      a.riwayatKelompok.map((r) => (
                        <span key={r.idRiwayat} className="block">
                          {r.kelompok.nama} <span className="text-[10px] text-slate-400">({r.tahunAjaran.periode})</span>
                        </span>
                      ))
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600 space-y-0.5">
                    {(['akta', 'foto', 'kia'] as const).map((j) => {
                      const url = a.berkasAnak?.[j];
                      return (
                        <span key={j} className="block text-[10px]">
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="text-[#095c51] underline font-semibold">
                              {j.toUpperCase()}
                            </a>
                          ) : (
                            <span className="text-slate-400">{j.toUpperCase()} —</span>
                          )}
                        </span>
                      );
                    })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {a.berkasAnak ? (
                      <div className="space-y-1">
                        <span
                          className={`block px-2 py-1 rounded-md text-[10px] font-bold ${
                            a.berkasAnak.statusVerifikasi === 'DIVERIFIKASI'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.berkasAnak.statusVerifikasi === 'DITOLAK'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {a.berkasAnak.statusVerifikasi}
                        </span>
                        {a.berkasAnak.statusVerifikasi !== 'DIVERIFIKASI' && (
                          <button
                            onClick={() => verifikasi('anak', a.berkasAnak!.idBerkasAnak, 'DIVERIFIKASI')}
                            className="block w-full px-2 py-1 rounded-md bg-[#095c51] text-white text-[10px] font-bold cursor-pointer"
                          >
                            Verifikasi
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Belum ada berkas</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
