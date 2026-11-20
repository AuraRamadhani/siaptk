'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FolderArchive,
  ClipboardCheck,
  GraduationCap,
  AlertCircle,
  Clock,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import PanelKelompok from '@/components/PanelKelompok';
import PanelArsip from '@/components/PanelArsip';
import PanelAlumni from '@/components/PanelAlumni';
import Paginasi, { usePaginasi } from '@/components/Paginasi';

type Dashboard = {
  siswa: { total: number; aktif: number; pendaftar: number };
  keuangan: {
    totalSaldo: number;
    totalTagihan: number;
    tunggakan: number;
    persenTertagih: number;
    tagihanLunas: number;
  };
  bulanIni: { setor: number; tarik: number; jumlahTransaksi: number; antreanVerifikasi: number };
  perJenis: { jenis: string; jumlah: number; lunas: number; nominal: number }[];
};

type Pendaftar = {
  idAnak: string;
  nama: string;
  nik: string;
  status: string;
  deadlineBayar?: string | null;
  alasanPenolakan?: string | null;
  keluarga?: { namaAyah: string | null; namaIbu: string | null; noHp: string };
};

const rp = (n: number) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

type Tab = 'dashboard' | 'verifikasi_berkas' | 'kelompok' | 'arsip' | 'alumni';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'verifikasi_berkas', label: 'Verifikasi Berkas', icon: ClipboardCheck },
  { id: 'kelompok', label: 'Pengelompokan Rombel', icon: Users },
  { id: 'arsip', label: 'Arsip Digital Siswa', icon: FolderArchive },
  { id: 'alumni', label: 'Data Alumni (DB 2)', icon: GraduationCap },
];

const TAB_INFO: Record<Tab, { title: string; desc: string }> = {
  dashboard: {
    title: 'Dashboard Kepala Sekolah',
    desc: 'Rekapitulasi keuangan, status pendaftaran, dan penetapan penerimaan calon siswa baru.',
  },
  verifikasi_berkas: {
    title: 'Verifikasi Berkas Calon Siswa Baru',
    desc: 'Periksa keabsahan berkas persyaratan calon siswa (Akta, Foto, KIA, KK, KTP). Setelah disetujui, tagihan pendaftaran dapat dibayar oleh orang tua.',
  },
  kelompok: {
    title: 'Pengelompokan Rombongan Belajar',
    desc: 'Atur dan pantau pembagian rombongan belajar (KB, TK A, TK B) berdasarkan usia siswa.',
  },
  arsip: {
    title: 'Arsip Digital Siswa Terdaftar',
    desc: 'Pusat arsip berkas lengkap, dokumen identitas, dan riwayat kelompok bagi seluruh siswa aktif yang terdaftar.',
  },
  alumni: {
    title: 'Kelulusan Siswa & Data Alumni (Database 2)',
    desc: 'Pengelolaan siswa lulus dan pencatatan riwayat alumni yang disimpan ke database sekunder (alumni_siaptk).',
  },
};

export default function PortalKepalaSekolah() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<Dashboard | null>(null);
  const [pendaftar, setPendaftar] = useState<Pendaftar[]>([]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAlasanModal, setShowAlasanModal] = useState<{ idAnak: string; nama: string; aksi: 'terima' | 'tolak' } | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [galatAlasan, setGalatAlasan] = useState(false);
  const [detailTolak, setDetailTolak] = useState<{ nama: string; alasan: string } | null>(null);

  const halPendaftar = usePaginasi(pendaftar);

  const muat = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/pendaftaran', { cache: 'no-store' }).then((x) => x.json()),
      ]);
      setData(d.data || null);
      setPendaftar(p.data || []);
    } catch {
      setPesan('Gagal memuat dashboard.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const bukaModalAlasan = (idAnak: string, nama: string, aksi: 'terima' | 'tolak') => {
    setShowAlasanModal({ idAnak, nama, aksi });
    setAlasanTolak('');
    setGalatAlasan(false);
  };

  const tutupModalAlasan = () => {
    setShowAlasanModal(null);
    setAlasanTolak('');
    setGalatAlasan(false);
  };

  const tetapkan = async (idAnak: string, aksi: 'terima' | 'tolak') => {
    if (aksi === 'tolak' && !alasanTolak.trim()) {
      // Ditampilkan tepat di bawah kolom isian, karena pesan di halaman tertutup modal.
      setGalatAlasan(true);
      return;
    }
    setGalatAlasan(false);
    const body: any = { idAnak, aksi };
    if (aksi === 'tolak') {
      body.alasanPenolakan = alasanTolak.trim();
    }
    const res = await fetch('/api/pendaftaran', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    if (res.success) {
      setPesan(res.message);
      tutupModalAlasan();
      muat();
    } else {
      setPesan(res.error || 'Gagal memproses.');
    }
  };

  const kpi = [
    { label: 'Siswa Aktif', nilai: String(data?.siswa.aktif ?? 0), sub: `${data?.siswa.pendaftar ?? 0} calon pendaftar`, icon: Users },
    { label: 'Saldo Tabungan', nilai: rp(data?.keuangan.totalSaldo ?? 0), sub: 'seluruh siswa terdaftar', icon: GraduationCap },
    { label: 'Tunggakan', nilai: rp(data?.keuangan.tunggakan ?? 0), sub: `${data?.keuangan.persenTertagih ?? 0}% tertagih`, icon: AlertCircle },
    {
      label: 'Antrean Verifikasi',
      nilai: String(data?.bulanIni.antreanVerifikasi ?? 0),
      sub: 'transaksi menunggu',
      icon: Clock,
    },
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

            {TABS.map((t) => {
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
                  {t.id === 'dashboard' && pendaftar.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-[#095c51] rounded-full font-bold">
                      {pendaftar.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* INFO BADGE CARD */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#095c51] flex items-center justify-center font-bold text-sm">
              KS
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900 truncate">Kepala Sekolah</div>
              <div className="text-[10px] text-slate-400">Pimpinan & Otorisasi</div>
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

          {pesan && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3 flex items-center justify-between">
              <span>{pesan}</span>
              <button
                onClick={() => setPesan('')}
                className="text-amber-800 font-bold hover:underline cursor-pointer text-[11px]"
              >
                Tutup
              </button>
            </div>
          )}

          {tab === 'verifikasi_berkas' && <PanelArsip mode="verifikasi_pendaftaran" />}
          {tab === 'kelompok' && <PanelKelompok />}
          {tab === 'arsip' && <PanelArsip mode="arsip_aktif" />}
          {tab === 'alumni' && <PanelAlumni />}

          {tab === 'dashboard' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpi.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{k.label}</span>
                        <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#095c51] flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 mt-2">{k.nilai}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{k.sub}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Penerimaan per jenis tagihan */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">Penerimaan per Jenis Tagihan</h2>
                  {(data?.perJenis || []).map((j) => {
                    const persen = j.jumlah > 0 ? Math.round((j.lunas / j.jumlah) * 100) : 0;
                    return (
                      <div key={j.jenis} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{j.jenis}</span>
                          <span className="text-slate-500">
                            {j.lunas}/{j.jumlah} lunas · {rp(j.nominal)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[#095c51]" style={{ width: `${persen}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Arus tabungan bulan berjalan */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">Arus Tabungan Bulan Ini</h2>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                      <div className="text-[11px] text-emerald-700 font-semibold">Setoran</div>
                      <div className="text-sm font-extrabold text-emerald-800 mt-1">{rp(data?.bulanIni.setor ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100">
                      <div className="text-[11px] text-rose-700 font-semibold">Penarikan/SPP</div>
                      <div className="text-sm font-extrabold text-rose-800 mt-1">{rp(data?.bulanIni.tarik ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <div className="text-[11px] text-slate-600 font-semibold">Transaksi</div>
                      <div className="text-sm font-extrabold text-slate-800 mt-1">{data?.bulanIni.jumlahTransaksi ?? 0}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hanya transaksi terverifikasi yang dihitung pada arus bulan berjalan.
                  </p>
                </div>
              </div>

              {/* Penetapan penerimaan */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Penetapan Penerimaan Siswa</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{pendaftar.length} calon siswa menunggu penetapan.</p>
                  </div>
                </div>
                {pendaftar.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada calon siswa yang menunggu penetapan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-6 py-3.5 font-semibold">Nama Siswa</th>
                          <th className="text-left px-4 py-3.5 font-semibold">NIK</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Orang Tua</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Deadline Bayar</th>
                          <th className="text-left px-4 py-3.5 font-semibold">Status</th>
                          <th className="text-right px-6 py-3.5 font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {halPendaftar.data.map((p) => (
                          <tr key={p.idAnak} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-3.5 font-bold text-slate-900">{p.nama}</td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">{p.nik}</td>
                            <td className="px-4 py-3.5 text-slate-600">
                              <div>{p.keluarga?.namaAyah || '-'} / {p.keluarga?.namaIbu || '-'}</div>
                              <div className="text-[10px] text-slate-400">{p.keluarga?.noHp || ''}</div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {p.deadlineBayar ? (
                                <span className="text-xs font-semibold text-amber-700">
                                  {new Date(p.deadlineBayar).toLocaleDateString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {p.alasanPenolakan ? (
                                <span
                                  className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                                  title={p.alasanPenolakan}
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Ditolak</span>
                                </span>
                              ) : p.deadlineBayar ? (
                                <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-sky-600" />
                                  <span>Menunggu Bayar</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Belum Ditetapkan</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                {p.alasanPenolakan && (
                                  <button
                                    onClick={() => setDetailTolak({ nama: p.nama, alasan: String(p.alasanPenolakan) })}
                                    title="Lihat alasan penolakan"
                                    aria-label={`Lihat alasan penolakan ${p.nama}`}
                                    className="w-8 h-8 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => bukaModalAlasan(p.idAnak, p.nama, 'terima')}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-xs"
                                >
                                  {p.alasanPenolakan ? 'Terima Ulang' : p.deadlineBayar ? 'Perpanjang' : 'Terima'}
                                </button>
                                <button
                                  onClick={() => bukaModalAlasan(p.idAnak, p.nama, 'tolak')}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                                >
                                  {p.alasanPenolakan ? 'Ubah Alasan' : 'Tolak'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Paginasi
                  halaman={halPendaftar.halaman}
                  totalHalaman={halPendaftar.totalHalaman}
                  total={halPendaftar.total}
                  perHalaman={halPendaftar.perHalaman}
                  mulai={halPendaftar.mulai}
                  onHalaman={halPendaftar.setHalaman}
                  onPerHalaman={halPendaftar.gantiPerHalaman}
                  satuan="calon siswa"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL LIHAT ALASAN PENOLAKAN */}
      {detailTolak && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Alasan Penolakan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calon siswa: <span className="font-semibold text-slate-800">{detailTolak.nama}</span>
                </p>
              </div>
              <button
                onClick={() => setDetailTolak(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
              {detailTolak.alasan}
            </p>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setDetailTolak(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALASAN TOLAK / KONFIRMASI TERIMA */}
      {showAlasanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {showAlasanModal.aksi === 'terima' ? 'Konfirmasi Penerimaan Siswa' : 'Alasan Penolakan Pendaftaran'}
              </h2>
              <button
                onClick={tutupModalAlasan}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Calon Siswa: <span className="font-bold text-slate-900">{showAlasanModal.nama}</span>
            </p>
            {showAlasanModal.aksi === 'tolak' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={alasanTolak}
                  onChange={(e) => {
                    setAlasanTolak(e.target.value);
                    if (e.target.value.trim()) setGalatAlasan(false);
                  }}
                  rows={4}
                  placeholder="Tulis alasan penolakan secara jelas (wajib diisi)..."
                  aria-invalid={galatAlasan}
                  aria-describedby={galatAlasan ? 'galat-alasan-tolak' : undefined}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    galatAlasan
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-[#095c51]'
                  }`}
                />
                {galatAlasan && (
                  <p
                    id="galat-alasan-tolak"
                    role="alert"
                    className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-start gap-1"
                  >
                    <span aria-hidden="true">⚠</span>
                    <span>Alasan penolakan wajib diisi sebelum menyimpan.</span>
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={tutupModalAlasan}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => tetapkan(showAlasanModal.idAnak, showAlasanModal.aksi)}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs ${
                  showAlasanModal.aksi === 'terima'
                    ? 'bg-[#095c51] hover:bg-[#074840]'
                    : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                {showAlasanModal.aksi === 'terima' ? 'Terima & Set Deadline 2 Minggu' : 'Tolak & Simpan Alasan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
