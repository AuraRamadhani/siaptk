'use client';

import React, { useEffect, useState } from 'react';

type Tema = { idTema: string; namaTema: string; mingguKe: number };
type Anak = { idAnak: string; nama: string; nik: string };
type Laporan = {
  idLaporan: string;
  aspek: string;
  catatanKegiatan: string;
  anak: { idAnak: string; nama: string };
  tema: { idTema: string; namaTema: string; mingguKe: number };
};

const ASPEK = ['SOSIAL', 'KOGNITIF', 'MOTORIK', 'EMOSI'];

export default function PortalGuru() {
  const [tab, setTab] = useState<'laporan' | 'tema'>('laporan');
  const [tema, setTema] = useState<Tema[]>([]);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [siswa, setSiswa] = useState<Anak[]>([]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ idAnak: '', idTema: '', aspek: 'SOSIAL', catatanKegiatan: '' });
  const [formTema, setFormTema] = useState({ namaTema: '', mingguKe: '' });

  const muat = async () => {
    setLoading(true);
    try {
      const [t, l, a] = await Promise.all([
        fetch('/api/tema-pembelajaran').then((x) => x.json()),
        fetch('/api/laporan-mingguan').then((x) => x.json()),
        fetch('/api/arsip?status=AKTIF').then((x) => x.json()),
      ]);
      setTema(t.data || []);
      setLaporan(l.data || []);
      setSiswa(a.data || []);
    } catch {
      setPesan('Gagal memuat data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const simpanLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idAnak || !form.idTema || !form.catatanKegiatan.trim()) {
      setPesan('Siswa, tema, dan catatan wajib diisi.');
      return;
    }
    const res = await fetch('/api/laporan-mingguan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) {
      setForm({ idAnak: '', idTema: '', aspek: 'SOSIAL', catatanKegiatan: '' });
      muat();
    }
  };

  const simpanTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTema.namaTema.trim() || !formTema.mingguKe) {
      setPesan('Nama tema dan minggu ke wajib diisi.');
      return;
    }
    const res = await fetch('/api/tema-pembelajaran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namaTema: formTema.namaTema, mingguKe: Number(formTema.mingguKe) }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) {
      setFormTema({ namaTema: '', mingguKe: '' });
      muat();
    }
  };

  const hapusLaporan = async (idLaporan: string) => {
    const res = await fetch(`/api/laporan-mingguan?idLaporan=${idLaporan}`, { method: 'DELETE' }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  const hapusTema = async (idTema: string) => {
    const res = await fetch(`/api/tema-pembelajaran?idTema=${idTema}`, { method: 'DELETE' }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Portal Guru Kelas</h1>
        <p className="text-xs text-slate-500 mt-1">Kelola tema pembelajaran dan laporan perkembangan siswa.</p>
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="flex gap-2">
        {(['laporan', 'tema'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
              tab === t ? 'bg-[#095c51] text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t === 'laporan' ? 'Laporan Mingguan' : 'Tema Pembelajaran'}
          </button>
        ))}
      </div>

      {tab === 'laporan' && (
        <>
          <form onSubmit={simpanLaporan} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Input Laporan Perkembangan</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Siswa</span>
                <select
                  value={form.idAnak}
                  onChange={(e) => setForm({ ...form, idAnak: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">— pilih siswa —</option>
                  {siswa.map((s) => (
                    <option key={s.idAnak} value={s.idAnak}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Tema</span>
                <select
                  value={form.idTema}
                  onChange={(e) => setForm({ ...form, idTema: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">— pilih tema —</option>
                  {tema.map((t) => (
                    <option key={t.idTema} value={t.idTema}>
                      Minggu {t.mingguKe}: {t.namaTema}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Aspek</span>
                <select
                  value={form.aspek}
                  onChange={(e) => setForm({ ...form, aspek: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  {ASPEK.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-xs space-y-1 block">
              <span className="font-semibold text-slate-600">Catatan kegiatan</span>
              <textarea
                value={form.catatanKegiatan}
                onChange={(e) => setForm({ ...form, catatanKegiatan: e.target.value })}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                placeholder="Deskripsi perkembangan siswa minggu ini…"
              />
            </label>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer"
            >
              Simpan Laporan
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Laporan Tersimpan</h2>
              <p className="text-xs text-slate-500 mt-1">{laporan.length} laporan.</p>
            </div>
            {loading ? (
              <div className="p-6 text-xs text-slate-500">Memuat…</div>
            ) : laporan.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada laporan.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                    <th className="text-left px-3 py-3 font-semibold">Tema</th>
                    <th className="text-left px-3 py-3 font-semibold">Aspek</th>
                    <th className="text-left px-3 py-3 font-semibold">Catatan</th>
                    <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.map((l) => (
                    <tr key={l.idLaporan} className="border-t border-slate-100">
                      <td className="px-6 py-3 font-semibold text-slate-900">{l.anak?.nama}</td>
                      <td className="px-3 py-3 text-slate-600">
                        M{l.tema?.mingguKe} · {l.tema?.namaTema}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{l.aspek}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-xs truncate">{l.catatanKegiatan}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => hapusLaporan(l.idLaporan)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'tema' && (
        <>
          <form onSubmit={simpanTema} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Tambah Tema Mingguan</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <label className="text-xs space-y-1 md:col-span-2">
                <span className="font-semibold text-slate-600">Nama tema</span>
                <input
                  value={formTema.namaTema}
                  onChange={(e) => setFormTema({ ...formTema, namaTema: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  placeholder="Contoh: Binatang di Sekitarku"
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Minggu ke</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={formTema.mingguKe}
                  onChange={(e) => setFormTema({ ...formTema, mingguKe: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </label>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer"
            >
              Simpan Tema
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Daftar Tema</h2>
            </div>
            {tema.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada tema.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Minggu</th>
                    <th className="text-left px-3 py-3 font-semibold">Nama Tema</th>
                    <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tema.map((t) => (
                    <tr key={t.idTema} className="border-t border-slate-100">
                      <td className="px-6 py-3 font-semibold text-slate-900">{t.mingguKe}</td>
                      <td className="px-3 py-3 text-slate-600">{t.namaTema}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => hapusTema(t.idTema)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}