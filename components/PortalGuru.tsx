'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  FileText,
  BookOpen,
  Plus,
  GraduationCap,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';
import { useToast } from '@/components/Toast';

type KodeKelas = 'KB' | 'A' | 'B';
type FilterKelas = 'SEMUA' | KodeKelas;

type Tema = { idTema: string; namaTema: string; mingguKe: number };
type RiwayatKelompokItem = { idRiwayat: string; kelompok: { idKelompok: string; nama: string } };
type Anak = {
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  keluarga?: { namaAyah: string | null; namaIbu: string | null };
  riwayatKelompok?: RiwayatKelompokItem[];
};
type Laporan = {
  idLaporan: string;
  aspek: string;
  catatanKegiatan: string;
  anak: {
    idAnak: string;
    nama: string;
    tglLahir?: string;
    riwayatKelompok?: RiwayatKelompokItem[];
  };
  tema: { idTema: string; namaTema: string; mingguKe: number };
};

const ASPEK = ['SOSIAL', 'KOGNITIF', 'MOTORIK', 'EMOSI'];

const LABEL_KELAS: Record<KodeKelas, string> = {
  KB: 'KB (Kelompok Bermain)',
  A: 'TK A',
  B: 'TK B',
};

const BADGE_KELAS: Record<KodeKelas, string> = {
  KB: 'bg-amber-100 text-amber-800',
  A: 'bg-teal-100 text-[#095c51]',
  B: 'bg-blue-100 text-blue-800',
};

function kodeKelasAnak(anak: { tglLahir?: string; riwayatKelompok?: RiwayatKelompokItem[] }): KodeKelas | null {
  const namaDb = anak.riwayatKelompok?.[0]?.kelompok?.nama?.toUpperCase() || '';
  if (namaDb.includes('KB') || namaDb.includes('BERMAIN')) return 'KB';
  if (namaDb.includes('TK A') || namaDb === 'A') return 'A';
  if (namaDb.includes('TK B') || namaDb === 'B') return 'B';

  if (anak.tglLahir) {
    const info = tentukanKelompokDariTglLahir(anak.tglLahir);
    if (info?.kode === 'KB') return 'KB';
    if (info?.kode === 'TK A') return 'A';
    if (info?.kode === 'TK B') return 'B';
  }
  return null;
}

type TabGuru = 'laporan' | 'kelas' | 'tema';

const TAB_INFO: Record<TabGuru, { title: string; desc: string }> = {
  laporan: {
    title: 'Laporan Perkembangan Mingguan',
    desc: 'Catat dan kelola evaluasi mingguan siswa meliputi aspek sosial, kognitif, motorik, dan emosi.',
  },
  kelas: {
    title: 'Kelompok Kelas (KB, TK A, TK B)',
    desc: 'Pantau pembagian rombongan belajar siswa aktif dan buat laporan perkembangan secara cepat.',
  },
  tema: {
    title: 'Tema Pembelajaran Mingguan',
    desc: 'Atur agenda tema kurikulum per minggu untuk panduan pembelajaran dan penilaian siswa.',
  },
};

export default function PortalGuru() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabGuru>('laporan');
  const [tema, setTema] = useState<Tema[]>([]);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [siswa, setSiswa] = useState<Anak[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter kelompok kelas & pencarian nama anak
  const [filterKelasInput, setFilterKelasInput] = useState<FilterKelas>('SEMUA');
  const [cariInput, setCariInput] = useState('');
  const [filterKelasTab, setFilterKelasTab] = useState<FilterKelas>('SEMUA');
  const [cariKelasTab, setCariKelasTab] = useState('');
  const [filterKelasLaporan, setFilterKelasLaporan] = useState<FilterKelas>('SEMUA');
  const [cariLaporan, setCariLaporan] = useState('');

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
      toast.error('Gagal memuat data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jumlahPerKelas = useMemo(() => {
    const counts: Record<FilterKelas, number> = { SEMUA: siswa.length, KB: 0, A: 0, B: 0 };
    for (const s of siswa) {
      const k = kodeKelasAnak(s);
      if (k) counts[k]++;
    }
    return counts;
  }, [siswa]);

  const siswaTersaringInput = useMemo(() => {
    const q = cariInput.trim().toLowerCase();
    return siswa.filter((s) => {
      const k = kodeKelasAnak(s);
      if (filterKelasInput !== 'SEMUA' && k !== filterKelasInput) return false;
      if (q && !s.nama.toLowerCase().includes(q) && !s.nik.includes(q)) return false;
      return true;
    });
  }, [siswa, filterKelasInput, cariInput]);

  const siswaTersaringKelas = useMemo(() => {
    const q = cariKelasTab.trim().toLowerCase();
    return siswa.filter((s) => {
      const k = kodeKelasAnak(s);
      if (filterKelasTab !== 'SEMUA' && k !== filterKelasTab) return false;
      if (q && !s.nama.toLowerCase().includes(q) && !s.nik.includes(q)) return false;
      return true;
    });
  }, [siswa, filterKelasTab, cariKelasTab]);

  const laporanTersaring = useMemo(() => {
    const q = cariLaporan.trim().toLowerCase();
    return laporan.filter((l) => {
      const k = kodeKelasAnak(l.anak || {});
      if (filterKelasLaporan !== 'SEMUA' && k !== filterKelasLaporan) return false;
      if (q && !(l.anak?.nama || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [laporan, filterKelasLaporan, cariLaporan]);

  const simpanLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idAnak || !form.idTema || !form.catatanKegiatan.trim()) {
      toast.warning('Siswa, tema, dan catatan wajib diisi.');
      return;
    }
    const res = await fetch('/api/laporan-mingguan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then((x) => x.json());
    if (res.success) {
      toast.success(res.message || 'Laporan berhasil disimpan.');
      setForm({ idAnak: '', idTema: '', aspek: 'SOSIAL', catatanKegiatan: '' });
      muat();
    } else {
      toast.error(res.error || 'Gagal menyimpan laporan.');
    }
  };

  const hapusLaporan = async (idLaporan: string) => {
    if (!confirm('Hapus catatan laporan ini?')) return;
    const res = await fetch(`/api/laporan-mingguan?idLaporan=${idLaporan}`, { method: 'DELETE' }).then((x) => x.json());
    if (res.success) toast.info(res.message || 'Laporan dihapus.');
    else toast.error(res.error || 'Gagal menghapus laporan.');
    muat();
  };

  const simpanTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTema.namaTema.trim() || !formTema.mingguKe) {
      toast.warning('Nama tema dan minggu ke- wajib diisi.');
      return;
    }
    const res = await fetch('/api/tema-pembelajaran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namaTema: formTema.namaTema.trim(), mingguKe: Number(formTema.mingguKe) }),
    }).then((x) => x.json());
    if (res.success) {
      toast.success(res.message || 'Tema berhasil disimpan.');
      setFormTema({ namaTema: '', mingguKe: '' });
      muat();
    } else {
      toast.error(res.error || 'Gagal menyimpan tema.');
    }
  };

  const hapusTema = async (idTema: string) => {
    if (!confirm('Hapus tema pembelajaran ini?')) return;
    const res = await fetch(`/api/tema-pembelajaran?idTema=${idTema}`, { method: 'DELETE' }).then((x) => x.json());
    if (res.success) toast.info(res.message || 'Tema dihapus.');
    else toast.error(res.error || 'Gagal menghapus tema.');
    muat();
  };

  const pilihAnakUntukLaporan = (anak: Anak) => {
    const k = kodeKelasAnak(anak);
    setFilterKelasInput(k || 'SEMUA');
    setCariInput('');
    setForm((prev) => ({ ...prev, idAnak: anak.idAnak }));
    setTab('laporan');
  };

  const TABS_GURU = [
    { id: 'laporan' as const, label: 'Laporan Mingguan', icon: FileText, count: laporan.length },
    { id: 'kelas' as const, label: 'Kelompok Kelas (KB, A, B)', icon: Users, count: siswa.length },
    { id: 'tema' as const, label: 'Tema Pembelajaran', icon: BookOpen, count: tema.length },
  ];

  return (
    <div className="w-full px-4 sm:px-6 md:px-10 py-6 md:py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 space-y-4 shrink-0">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#095c51]" />
              <span>MENU PORTAL</span>
            </div>

            {TABS_GURU.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.label}</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-[#095c51] rounded-full font-bold">
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* RINGKASAN ROMBEL CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#095c51]" />
              <span>Ringkasan Kelompok</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">Kelompok Bermain (KB)</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  {jumlahPerKelas.KB} anak
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600">Kelompok TK A</span>
                <span className="font-bold text-[#095c51] bg-teal-50 px-2 py-0.5 rounded-md">
                  {jumlahPerKelas.A} anak
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Kelompok TK B</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {jumlahPerKelas.B} anak
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* HEADER CARD */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{TAB_INFO[tab].title}</h1>
              <p className="text-xs text-slate-500 mt-1">{TAB_INFO[tab].desc}</p>
            </div>
            <button
              onClick={muat}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* TAB: KELOMPOK KELAS (KB, A, B) */}
          {tab === 'kelas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  { id: 'SEMUA' as FilterKelas, label: 'Semua Kelompok' },
                  { id: 'KB' as FilterKelas, label: 'Kelompok Bermain (KB)' },
                  { id: 'A' as FilterKelas, label: 'Kelompok TK A' },
                  { id: 'B' as FilterKelas, label: 'Kelompok TK B' },
                ]).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterKelasTab(item.id)}
                    className={`p-5 rounded-3xl border text-left transition cursor-pointer ${
                      filterKelasTab === item.id
                        ? 'bg-[#095c51] text-white border-[#095c51] shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-[#095c51]/40'
                    }`}
                  >
                    <div
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        filterKelasTab === item.id ? 'text-teal-200' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-2xl font-extrabold mt-1">{jumlahPerKelas[item.id]} Siswa</div>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Daftar Siswa — {filterKelasTab === 'SEMUA' ? 'Semua Kelompok' : LABEL_KELAS[filterKelasTab]}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih kelompok kelas (KB, A, B) lalu klik &quot;Buat Laporan&quot; untuk mengisi perkembangan anak.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cariKelasTab}
                      onChange={(e) => setCariKelasTab(e.target.value)}
                      placeholder="Cari nama anak atau NIK..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="p-8 text-xs text-slate-500 text-center">Memuat data siswa…</div>
                ) : siswaTersaringKelas.length === 0 ? (
                  <div className="p-8 text-xs text-slate-400 text-center">
                    Tidak ada siswa pada kelompok atau pencarian ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-6 py-3.5 font-semibold">Nama Anak</th>
                          <th className="text-left px-4 py-3.5 font-semibold">NIK</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Kelompok Kelas</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Orang Tua</th>
                          <th className="text-right px-6 py-3.5 font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {siswaTersaringKelas.map((s) => {
                          const k = kodeKelasAnak(s);
                          return (
                            <tr key={s.idAnak} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-3.5 font-bold text-slate-900">{s.nama}</td>
                              <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">{s.nik}</td>
                              <td className="px-4 py-3.5">
                                {k ? (
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${BADGE_KELAS[k]}`}>
                                    {LABEL_KELAS[k]}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Belum dikelompokkan</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-slate-600">
                                {s.keluarga?.namaAyah || s.keluarga?.namaIbu || '-'}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => pilihAnakUntukLaporan(s)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white font-bold cursor-pointer inline-flex items-center gap-1 shadow-xs transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Buat Laporan</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LAPORAN MINGGUAN */}
          {tab === 'laporan' && (
            <div className="space-y-6">
              <form onSubmit={simpanLaporan} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Form Input Laporan Perkembangan</h2>

                  {/* Filter Kelompok Langsung */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Kelompok:</span>
                    {([
                      { id: 'SEMUA' as FilterKelas, label: `Semua (${jumlahPerKelas.SEMUA})` },
                      { id: 'KB' as FilterKelas, label: `KB (${jumlahPerKelas.KB})` },
                      { id: 'A' as FilterKelas, label: `TK A (${jumlahPerKelas.A})` },
                      { id: 'B' as FilterKelas, label: `TK B (${jumlahPerKelas.B})` },
                    ]).map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setFilterKelasInput(k.id);
                          setForm((prev) => ({ ...prev, idAnak: '' }));
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                          filterKelasInput === k.id
                            ? 'bg-[#095c51] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-slate-600">Cari Siswa</span>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cariInput}
                        onChange={(e) => setCariInput(e.target.value)}
                        placeholder="Ketik nama anak..."
                        className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                      />
                    </div>
                  </label>

                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-slate-600">
                      Pilih Siswa ({siswaTersaringInput.length}) *
                    </span>
                    <select
                      value={form.idAnak}
                      onChange={(e) => setForm({ ...form, idAnak: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                    >
                      <option value="">— pilih siswa —</option>
                      {siswaTersaringInput.map((s) => {
                        const k = kodeKelasAnak(s);
                        return (
                          <option key={s.idAnak} value={s.idAnak}>
                            {s.nama} {k ? `(${k === 'KB' ? 'KB' : `TK ${k}`})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-slate-600">Tema Pembelajaran *</span>
                    <select
                      value={form.idTema}
                      onChange={(e) => setForm({ ...form, idTema: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
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
                    <span className="font-semibold text-slate-600">Aspek Perkembangan *</span>
                    <select
                      value={form.aspek}
                      onChange={(e) => setForm({ ...form, aspek: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
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
                  <span className="font-semibold text-slate-600">Catatan Kegiatan & Perkembangan *</span>
                  <textarea
                    value={form.catatanKegiatan}
                    onChange={(e) => setForm({ ...form, catatanKegiatan: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
                    placeholder="Deskripsi kegiatan belajar dan capaian perkembangan siswa minggu ini…"
                  />
                </label>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  Simpan Laporan Perkembangan
                </button>
              </form>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Riwayat Laporan Tersimpan</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{laporanTersaring.length} laporan ditampilkan.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['SEMUA', 'KB', 'A', 'B'] as FilterKelas[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFilterKelasLaporan(k)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition ${
                          filterKelasLaporan === k
                            ? 'bg-[#095c51] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {k === 'SEMUA' ? 'Semua' : k === 'KB' ? 'KB' : `TK ${k}`}
                      </button>
                    ))}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cariLaporan}
                        onChange={(e) => setCariLaporan(e.target.value)}
                        placeholder="Cari nama anak..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                      />
                    </div>
                  </div>
                </div>
                {loading ? (
                  <div className="p-8 text-xs text-slate-500 text-center">Memuat…</div>
                ) : laporanTersaring.length === 0 ? (
                  <div className="p-8 text-xs text-slate-400 text-center">
                    Belum ada laporan pada filter ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-6 py-3.5 font-semibold">Siswa</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Kelompok</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Tema</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Aspek</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Catatan Kegiatan</th>
                          <th className="text-right px-6 py-3.5 font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {laporanTersaring.map((l) => {
                          const k = kodeKelasAnak(l.anak || {});
                          return (
                            <tr key={l.idLaporan} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-3.5 font-bold text-slate-900">{l.anak?.nama}</td>
                              <td className="px-4 py-3.5">
                                {k ? (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${BADGE_KELAS[k]}`}>
                                    {k === 'KB' ? 'KB' : `TK ${k}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-slate-600 font-medium">
                                M{l.tema?.mingguKe} · {l.tema?.namaTema}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {l.aspek}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{l.catatanKegiatan}</td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  onClick={() => hapusLaporan(l.idLaporan)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold cursor-pointer inline-flex items-center gap-1 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TEMA PEMBELAJARAN */}
          {tab === 'tema' && (
            <div className="space-y-6">
              <form onSubmit={simpanTema} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Tambah Tema Mingguan Baru
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <label className="text-xs space-y-1 md:col-span-2">
                    <span className="font-semibold text-slate-600">Nama Tema *</span>
                    <input
                      value={formTema.namaTema}
                      onChange={(e) => setFormTema({ ...formTema, namaTema: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
                      placeholder="Contoh: Binatang di Sekitarku / Alam Semesta"
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className="font-semibold text-slate-600">Minggu Ke- *</span>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={formTema.mingguKe}
                      onChange={(e) => setFormTema({ ...formTema, mingguKe: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  Simpan Tema Pembelajaran
                </button>
              </form>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Daftar Tema Pembelajaran</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{tema.length} tema aktif terdaftar.</p>
                  </div>
                </div>
                {tema.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Belum ada tema yang ditambahkan.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-6 py-3.5 font-semibold">Minggu</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Nama Tema</th>
                          <th className="text-right px-6 py-3.5 font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tema.map((t) => (
                          <tr key={t.idTema} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-3.5 font-bold text-slate-900">Minggu ke-{t.mingguKe}</td>
                            <td className="px-4 py-3.5 text-slate-700 font-medium">{t.namaTema}</td>
                            <td className="px-6 py-3.5 text-right">
                              <button
                                onClick={() => hapusTema(t.idTema)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold cursor-pointer inline-flex items-center gap-1 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
