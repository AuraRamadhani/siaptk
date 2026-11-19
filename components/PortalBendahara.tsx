'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/purity -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Download,
  X,
  Wallet,
  Receipt,
  FileDown,
  Banknote,
  Calendar,
  UserPlus,
  History,
  Settings,
  CircleDollarSign,
  BarChart3,
  RefreshCw,
  Coins,
} from 'lucide-react';
import PanelJadwal from '@/components/PanelJadwal';
import PanelPendaftaranAdmin from '@/components/PanelPendaftaranAdmin';
import { useToast } from '@/components/Toast';
import KuitansiDigitalModal, { DataKuitansi } from '@/components/KuitansiDigitalModal';

type Trx = {
  idTransaksi: string;
  jenis: 'SETOR' | 'TARIK' | 'BAYAR_SPP';
  metode: string;
  nominal: string | number;
  keterangan: string | null;
  bukti?: string | null;
  status: 'MENUNGGU' | 'DIVERIFIKASI' | 'DITOLAK';
  dicatatOleh: string | null;
  createdAt: string;
  tabungan?: { anak?: { nama: string; keluarga?: { namaAyah: string | null; namaIbu: string | null } } };
};

type Rekening = {
  idTabungan: string;
  saldo: string | number;
  anak: { idAnak: string; nama: string; status: string };
};

type TagihanPending = {
  idTagihan: string;
  jenis: string;
  bulan?: number | null;
  nominal: number;
  diskon: number;
  status: string;
  anak?: { nama: string; keluarga?: { namaAyah: string | null; namaIbu: string | null } };
  pembayaran?: { idPembayaran: string; metode: string; buktiTransfer: string | null; diverifikasiOleh?: string | null; catatanVerifikasi?: string | null }[];
};

type PenarikanPending = {
  idPenarikan: string;
  nominal: number;
  keterangan: string | null;
  status: string;
  catatanPenolakan?: string | null;
  diajukanOleh: string;
  createdAt: string;
  tabungan?: { anak?: { nama: string; keluarga?: { namaAyah: string | null; namaIbu: string | null } } };
};

const rp = (n: number) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const keUrlBerkas = (file: string) => (file.startsWith('/') || file.startsWith('http') ? file : `/uploads/${file}`);

const LABEL: Record<string, string> = { SETOR: 'Setoran', TARIK: 'Penarikan', BAYAR_SPP: 'Bayar SPP' };

type TabBendahara =
  | 'verifikasi'
  | 'tagihan'
  | 'penarikan'
  | 'jadwal'
  | 'onsite'
  | 'riwayat'
  | 'tarif_spp'
  | 'tunai'
  | 'rekonsiliasi';

const TAB_BENDAHARA_CONFIG: {
  id: TabBendahara;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}[] = [
  {
    id: 'verifikasi',
    label: 'Verifikasi Tabungan',
    icon: Wallet,
    title: 'Verifikasi Setoran Tabungan',
    desc: 'Periksa bukti transfer dan setujui atau tolak setoran tabungan siswa dari orang tua.',
  },
  {
    id: 'tagihan',
    label: 'Verifikasi Tagihan',
    icon: Receipt,
    title: 'Verifikasi Pembayaran Tagihan',
    desc: 'Verifikasi pembayaran tagihan SPP bulanan atau biaya pendaftaran calon siswa.',
  },
  {
    id: 'penarikan',
    label: 'Verifikasi Penarikan',
    icon: Banknote,
    title: 'Verifikasi Penarikan Tabungan',
    desc: 'Persetujuan dan pencatatan penarikan saldo tabungan oleh orang tua siswa.',
  },
  {
    id: 'jadwal',
    label: 'Jadwal Kunjungan',
    icon: Calendar,
    title: 'Jadwal Kunjungan & Kedatangan Orang Tua',
    desc: 'Kelola slot waktu kunjungan orang tua ke sekolah untuk verifikasi onsite atau pembayaran tunai.',
  },
  {
    id: 'onsite',
    label: 'Pendaftaran Onsite',
    icon: UserPlus,
    title: 'Pendaftaran Calon Siswa Baru Onsite',
    desc: 'Formulir pendaftaran langsung di tempat bagi calon siswa baru yang datang ke kantor sekolah.',
  },
  {
    id: 'tunai',
    label: 'Setoran Tunai Langsung',
    icon: CircleDollarSign,
    title: 'Pencatatan Setoran Tunai Langsung',
    desc: 'Input setoran tabungan tunai bagi orang tua siswa yang datang langsung ke sekolah.',
  },
  {
    id: 'tarif_spp',
    label: 'Pengaturan Tarif SPP',
    icon: Settings,
    title: 'Pengaturan Tarif SPP Bulanan',
    desc: 'Ubah tarif dasar bulanan dan terbitkan tagihan SPP ke seluruh siswa aktif.',
  },
  {
    id: 'riwayat',
    label: 'History Terverifikasi',
    icon: History,
    title: 'History Transaksi & Pembayaran',
    desc: 'Daftar seluruh riwayat pembayaran tagihan dan setoran tabungan yang sudah berhasil diverifikasi.',
  },
  {
    id: 'rekonsiliasi',
    label: 'Rekonsiliasi Mingguan',
    icon: BarChart3,
    title: 'Rekonsiliasi Keuangan 7 Hari',
    desc: 'Rekapitulasi transaksi terverifikasi 7 hari terakhir dikelompokkan per hari.',
  },
];

export default function PortalBendahara() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabBendahara>('verifikasi');
  const [antrean, setAntrean] = useState<Trx[]>([]);
  const [tagihanPending, setTagihanPending] = useState<TagihanPending[]>([]);
  const [tagihanLunas, setTagihanLunas] = useState<TagihanPending[]>([]);
  const [penarikanPending, setPenarikanPending] = useState<PenarikanPending[]>([]);
  const [terverifikasi, setTerverifikasi] = useState<Trx[]>([]);
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string>('');
  const [idAnak, setIdAnak] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [previewBukti, setPreviewBukti] = useState<{ label: string; url: string } | null>(null);
  const [showCatatanModal, setShowCatatanModal] = useState<{ tipe: 'tolak'; id: string; label: string } | null>(null);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [tarifSpp, setTarifSpp] = useState<number>(350000);
  const [inputTarifSpp, setInputTarifSpp] = useState<string>('350000');
  const [bulanGenerate, setBulanGenerate] = useState<number>(new Date().getMonth() + 1);
  const [loadingTarif, setLoadingTarif] = useState<boolean>(false);
  const [kuitansiAktif, setKuitansiAktif] = useState<DataKuitansi | null>(null);

  const muat = async () => {
    setLoading(true);
    try {
      const [a, v, r, tg, tgLunas, p, sppRes] = await Promise.all([
        fetch('/api/tabungan?status=MENUNGGU').then((x) => x.json()),
        fetch('/api/tabungan?status=DIVERIFIKASI').then((x) => x.json()),
        fetch('/api/tabungan').then((x) => x.json()),
        fetch('/api/tagihan?status=MENUNGGU_VERIFIKASI').then((x) => x.json()),
        fetch('/api/tagihan?status=LUNAS').then((x) => x.json()),
        fetch('/api/penarikan-tabungan?status=MENUNGGU').then((x) => x.json()),
        fetch('/api/pengaturan/tarif-spp').then((x) => x.json()).catch(() => ({})),
      ]);
      setAntrean(a.data || []);
      setTerverifikasi(v.data || []);
      setRekening(r.data || []);
      setTagihanPending(tg.data || []);
      setTagihanLunas(tgLunas.data || []);
      setPenarikanPending(p.data || []);
      if (sppRes?.success && sppRes.data?.tarif) {
        setTarifSpp(sppRes.data.tarif);
        setInputTarifSpp(String(sppRes.data.tarif));
      }
    } catch {
      setPesan('Gagal memuat data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const bukaCatatanTolak = (tipe: 'tabungan' | 'tagihan' | 'penarikan', id: string, label: string) => {
    setShowCatatanModal({ tipe: 'tolak', id, label: `${tipe}: ${label}` });
    setCatatanTolak('');
  };

  const tutupCatatanModal = () => {
    setShowCatatanModal(null);
    setCatatanTolak('');
  };

  const prosesVerifikasi = async (type: 'tabungan' | 'tagihan' | 'penarikan', id: string, aksi: 'verifikasi' | 'tolak') => {
    try {
      let res: any;
      if (type === 'tabungan') {
        res = await fetch('/api/tabungan', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idTransaksi: id, aksi, catatanPenolakan: catatanTolak }),
        }).then((x) => x.json());
      } else if (type === 'tagihan') {
        res = await fetch(`/api/pembayaran/${id}/verifikasi`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aksi, catatanVerifikasi: catatanTolak }),
        }).then((x) => x.json());
      } else if (type === 'penarikan') {
        res = await fetch('/api/penarikan-tabungan', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPenarikan: id, aksi, catatanPenolakan: catatanTolak }),
        }).then((x) => x.json());
      }

      if (res.success) {
        setPesan(aksi === 'verifikasi' ? 'Diverifikasi.' : 'Ditolak.');
        tutupCatatanModal();
        muat();
      } else {
        setPesan(res.error || 'Gagal memproses.');
      }
    } catch {
      setPesan('Terjadi kesalahan.');
    }
  };

  const simpanTunai = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tabungan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idAnak,
        jenis: 'SETOR',
        metode: 'TUNAI',
        nominal: Number(nominal),
        keterangan: keterangan || 'Setoran tunai di kantor',
        dicatatOleh: 'Bendahara',
      }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) {
      setNominal('');
      setKeterangan('');
      muat();
    }
  };

  const handleSimpanTarifSpp = async (e: React.FormEvent) => {
    e.preventDefault();
    const nilai = Number(inputTarifSpp);
    if (!Number.isFinite(nilai) || nilai <= 0) {
      toast.warning('Nominal tarif SPP harus lebih dari Rp 0.');
      return;
    }
    setLoadingTarif(true);
    try {
      const res = await fetch('/api/pengaturan/tarif-spp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi: 'simpan', nominal: nilai }),
      }).then((x) => x.json());
      if (res.success) {
        const tarifBaru = res.data?.tarif || nilai;
        setTarifSpp(tarifBaru);
        setInputTarifSpp(String(tarifBaru));
        toast.success(res.message || 'Tarif SPP berhasil diperbarui!');
        muat();
      } else {
        toast.error(res.error || 'Gagal memperbarui tarif SPP.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan tarif.');
    } finally {
      setLoadingTarif(false);
    }
  };

  const handleGenerateSppBulan = async () => {
    if (!confirm(`Terbitkan tagihan SPP untuk bulan ${bulanGenerate} ke seluruh siswa aktif?`)) return;
    setLoadingTarif(true);
    try {
      const res = await fetch('/api/pengaturan/tarif-spp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi: 'generate_bulan', bulan: bulanGenerate }),
      }).then((x) => x.json());
      if (res.success) {
        toast.success(res.message || 'Tagihan SPP berhasil diterbitkan.');
        muat();
      } else {
        toast.error(res.error || 'Gagal menerbitkan tagihan SPP.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menerbitkan tagihan.');
    } finally {
      setLoadingTarif(false);
    }
  };

  // Rekonsiliasi mingguan: transaksi terverifikasi 7 hari terakhir, dikelompokkan per hari
  const rekon = useMemo(() => {
    const batas = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rows = terverifikasi.filter((t) => new Date(t.createdAt).getTime() >= batas);
    const perHari = new Map<string, { masuk: number; keluar: number; jumlah: number }>();
    for (const t of rows) {
      const kunci = new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const cur = perHari.get(kunci) || { masuk: 0, keluar: 0, jumlah: 0 };
      if (t.jenis === 'SETOR') cur.masuk += Number(t.nominal);
      else cur.keluar += Number(t.nominal);
      cur.jumlah += 1;
      perHari.set(kunci, cur);
    }
    return Array.from(perHari.entries()).map(([tanggal, v]) => ({ tanggal, ...v }));
  }, [terverifikasi]);

  const totalSaldo = rekening.reduce((s, r) => s + Number(r.saldo), 0);
  const activeConfig = TAB_BENDAHARA_CONFIG.find((t) => t.id === tab) || TAB_BENDAHARA_CONFIG[0];

  return (
    <div className="w-full px-4 sm:px-6 md:px-10 py-6 md:py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 space-y-4 shrink-0">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#095c51]" />
              <span>MENU PORTAL</span>
            </div>

            {TAB_BENDAHARA_CONFIG.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              let badge: string | number | null = null;
              if (t.id === 'verifikasi' && antrean.length > 0) badge = antrean.length;
              if (t.id === 'tagihan' && tagihanPending.length > 0) badge = tagihanPending.length;
              if (t.id === 'penarikan' && penarikanPending.length > 0) badge = penarikanPending.length;
              if (t.id === 'riwayat') badge = tagihanLunas.length + terverifikasi.length;

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
                  {badge !== null && (
                    <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-[#095c51] rounded-full font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TOTAL SALDO SISWA CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#095c51]" />
              <span>Total Saldo Tabungan</span>
            </div>
            <div className="text-xl font-extrabold text-[#095c51] mt-1">{rp(totalSaldo)}</div>
            <div className="text-[10px] text-slate-400">{rekening.length} rekening siswa terdaftar</div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* HEADER CARD */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{activeConfig.title}</h1>
              <p className="text-xs text-slate-500 mt-1">{activeConfig.desc}</p>
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

      {/* TAB: VERIFIKASI TABUNGAN */}
      {tab === 'verifikasi' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Setoran Tabungan Menunggu Verifikasi</h2>
            <button onClick={muat} className="text-xs font-semibold text-[#095c51] cursor-pointer">
              Muat ulang
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-xs text-slate-500">Memuat…</div>
          ) : antrean.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">Tidak ada pengajuan tabungan menunggu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                    <th className="text-left px-3 py-3 font-semibold">Jenis & Keterangan</th>
                    <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                    <th className="text-left px-3 py-3 font-semibold">Bukti</th>
                    <th className="text-left px-3 py-3 font-semibold">Waktu</th>
                    <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {antrean.map((t) => (
                    <tr key={t.idTransaksi} className="border-t border-slate-100">
                      <td className="px-6 py-3 font-semibold text-slate-900">
                        {t.tabungan?.anak?.nama || '-'}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {t.tabungan?.anak?.keluarga?.namaAyah || t.tabungan?.anak?.keluarga?.namaIbu || ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="font-semibold">{LABEL[t.jenis]} · {t.metode}</span>
                        {t.keterangan && <span className="block text-[11px] text-slate-400">{t.keterangan}</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">{rp(Number(t.nominal))}</td>
                      <td className="px-3 py-3">
                        {t.bukti ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewBukti({
                                label: `Bukti Setoran - ${t.tabungan?.anak?.nama || ''}`,
                                url: keUrlBerkas(t.bukti!),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[#095c51] font-semibold hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500">{tgl(t.createdAt)}</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => prosesVerifikasi('tabungan', t.idTransaksi, 'verifikasi')}
                          className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                        >
                          Verifikasi
                        </button>
                        <button
                          onClick={() => bukaCatatanTolak('tabungan', t.idTransaksi, `Setoran ${t.tabungan?.anak?.nama}`)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold cursor-pointer"
                        >
                          Tolak
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: VERIFIKASI TAGIHAN */}
      {tab === 'tagihan' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Pembayaran Tagihan Menunggu Verifikasi</h2>
            <button onClick={muat} className="text-xs font-semibold text-[#095c51] cursor-pointer">
              Muat ulang
            </button>
          </div>
          {tagihanPending.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">Tidak ada pembayaran tagihan yang menunggu verifikasi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                    <th className="text-left px-3 py-3 font-semibold">Tagihan</th>
                    <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                    <th className="text-left px-3 py-3 font-semibold">Bukti Transfer</th>
                    <th className="text-left px-3 py-3 font-semibold">Catatan Verifikasi</th>
                    <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tagihanPending.map((tg) => {
                    const bayar = tg.pembayaran?.[tg.pembayaran.length - 1];
                    return (
                      <tr key={tg.idTagihan} className="border-t border-slate-100">
                        <td className="px-6 py-3 font-semibold text-slate-900">{tg.anak?.nama || '-'}</td>
                        <td className="px-3 py-3 text-slate-600">{tg.jenis === 'PENDAFTARAN' ? 'Biaya Pendaftaran' : `SPP Bulan ${tg.bulan}`}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">
                          {rp(Number(tg.nominal) - Number(tg.diskon || 0))}
                        </td>
                        <td className="px-3 py-3">
                          {bayar?.buktiTransfer ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBukti({
                                  label: `Bukti Pembayaran ${tg.jenis} - ${tg.anak?.nama || ''}`,
                                  url: keUrlBerkas(bayar.buktiTransfer!),
                                })
                              }
                              className="inline-flex items-center gap-1 text-[#095c51] font-semibold hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Bukti</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500 max-w-xs truncate">
                          {bayar?.catatanVerifikasi || (bayar?.buktiTransfer === null ? 'Bukti ditolak, menunggu upload ulang' : '—')}
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          {bayar ? (
                            <>
                              <button
                                onClick={() => prosesVerifikasi('tagihan', bayar.idPembayaran, 'verifikasi')}
                                className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                              >
                                Verifikasi
                              </button>
                              <button
                                onClick={() => bukaCatatanTolak('tagihan', bayar.idPembayaran, `Tagihan ${tg.anak?.nama}`)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: VERIFIKASI PENARIKAN */}
      {tab === 'penarikan' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Penarikan Tabungan Menunggu Verifikasi</h2>
            <button onClick={muat} className="text-xs font-semibold text-[#095c51] cursor-pointer">
              Muat ulang
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-xs text-slate-500">Memuat…</div>
          ) : penarikanPending.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">Tidak ada pengajuan penarikan menunggu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                    <th className="text-left px-3 py-3 font-semibold">Keterangan</th>
                    <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                    <th className="text-left px-3 py-3 font-semibold">Diajukan Oleh</th>
                    <th className="text-left px-3 py-3 font-semibold">Waktu</th>
                    <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {penarikanPending.map((p) => (
                    <tr key={p.idPenarikan} className="border-t border-slate-100">
                      <td className="px-6 py-3 font-semibold text-slate-900">
                        {p.tabungan?.anak?.nama || '-'}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {p.tabungan?.anak?.keluarga?.namaAyah || p.tabungan?.anak?.keluarga?.namaIbu || ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="font-semibold text-slate-800">Penarikan Tabungan</span>
                        {p.keterangan ? (
                          <div className="mt-1 p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-900 text-[11px] font-medium leading-relaxed">
                            <span className="font-bold text-[#095c51] block uppercase text-[10px]">Tujuan Transfer (TF):</span>
                            {p.keterangan}
                          </div>
                        ) : (
                          <span className="block text-[11px] text-slate-400">Tanpa rincian rekening</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-700">{rp(Number(p.nominal))}</td>
                      <td className="px-3 py-3 text-slate-600">{p.diajukanOleh}</td>
                      <td className="px-3 py-3 text-slate-500">{tgl(p.createdAt)}</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => prosesVerifikasi('penarikan', p.idPenarikan, 'verifikasi')}
                          className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                        >
                          Verifikasi
                        </button>
                        <button
                          onClick={() => bukaCatatanTolak('penarikan', p.idPenarikan, `Penarikan ${p.tabungan?.anak?.nama}`)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold cursor-pointer"
                        >
                          Tolak
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: JADWAL KUNJUNGAN */}
      {tab === 'jadwal' && <PanelJadwal />}

      {/* TAB: PENDAFTARAN ONSITE */}
      {tab === 'onsite' && <PanelPendaftaranAdmin onSukses={muat} />}

      {/* TAB: RIWAYAT TERVERIFIKASI */}
      {tab === 'riwayat' && (
        <div className="space-y-6">
          {/* History Pembayaran Tagihan Terverifikasi / Lunas */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">History Pembayaran Tagihan Terverifikasi (Lunas)</h2>
                <p className="text-xs text-slate-500 mt-0.5">{tagihanLunas.length} pembayaran tagihan sudah lunas.</p>
              </div>
              <button onClick={muat} className="text-xs font-semibold text-[#095c51] cursor-pointer">
                Muat ulang
              </button>
            </div>
            {tagihanLunas.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada pembayaran tagihan yang diverifikasi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                      <th className="text-left px-3 py-3 font-semibold">Tagihan</th>
                      <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                      <th className="text-left px-3 py-3 font-semibold">Metode</th>
                      <th className="text-left px-3 py-3 font-semibold">Diverifikasi Oleh</th>
                      <th className="text-left px-3 py-3 font-semibold">Bukti</th>
                      <th className="text-right px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagihanLunas.map((tg) => {
                      const bayar = tg.pembayaran?.[tg.pembayaran.length - 1];
                      return (
                        <tr key={tg.idTagihan} className="border-t border-slate-100">
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {tg.anak?.nama || '-'}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {tg.anak?.keluarga?.namaAyah || tg.anak?.keluarga?.namaIbu || ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {tg.jenis === 'PENDAFTARAN'
                              ? 'Biaya Pendaftaran PPDB'
                              : tg.jenis === 'SPP' && tg.bulan
                                ? `SPP Bulan ke-${tg.bulan}`
                                : tg.jenis}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900">
                            {rp(Number(tg.nominal) - Number(tg.diskon || 0))}
                          </td>
                          <td className="px-3 py-3 text-slate-600">{bayar?.metode || '-'}</td>
                          <td className="px-3 py-3 text-slate-600">{bayar?.diverifikasiOleh || 'Bendahara'}</td>
                          <td className="px-3 py-3">
                            {bayar?.buktiTransfer ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewBukti({
                                    label: `Bukti Pembayaran ${tg.jenis} - ${tg.anak?.nama || ''}`,
                                    url: keUrlBerkas(bayar.buktiTransfer!),
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[#095c51] font-semibold hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              LUNAS
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setKuitansiAktif({
                                  noKuitansi: `KWT/${new Date().getFullYear()}/${tg.idTagihan.slice(-6).toUpperCase()}`,
                                  tanggal: new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }),
                                  namaSiswa: tg.anak?.nama || (tg.anak as any)?.name || 'Siswa',
                                  kelompok: (tg.anak as any)?.kelompok || (tg.anak as any)?.group || null,
                                  namaWali: tg.anak?.keluarga?.namaAyah || tg.anak?.keluarga?.namaIbu || null,
                                  jenisPembayaran: tg.jenis === 'PENDAFTARAN' ? 'Pendaftaran Siswa Baru' : 'SPP Bulanan',
                                  periode: tg.bulan ? `Bulan ke-${tg.bulan}` : null,
                                  nominal: Number(tg.nominal) - Number(tg.diskon || 0),
                                  metodePembayaran: bayar?.metode || 'Transfer Bank (TF)',
                                  status: 'LUNAS',
                                  keterangan: 'Pembayaran telah diverifikasi lunas oleh Bendahara.',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#095c51] font-bold text-[10px] inline-flex items-center gap-1 transition cursor-pointer shadow-xs"
                              title="Cetak Kuitansi Digital PDF"
                            >
                              <FileDown className="w-3 h-3" />
                              <span>Kuitansi PDF</span>
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

          {/* History Transaksi Tabungan Terverifikasi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">History Transaksi Tabungan Terverifikasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">{terverifikasi.length} transaksi tabungan terverifikasi.</p>
            </div>
            {terverifikasi.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada transaksi tabungan terverifikasi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                      <th className="text-left px-3 py-3 font-semibold">Jenis & Keterangan</th>
                      <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                      <th className="text-left px-3 py-3 font-semibold">Dicatat / Verifikasi</th>
                      <th className="text-left px-3 py-3 font-semibold">Bukti</th>
                      <th className="text-right px-6 py-3 font-semibold">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terverifikasi.map((t) => (
                      <tr key={t.idTransaksi} className="border-t border-slate-100">
                        <td className="px-6 py-3 font-semibold text-slate-900">{t.tabungan?.anak?.nama || '-'}</td>
                        <td className="px-3 py-3 text-slate-600">
                          <span className="font-semibold">{LABEL[t.jenis]} · {t.metode}</span>
                          {t.keterangan && <span className="block text-[11px] text-slate-400">{t.keterangan}</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700">{rp(Number(t.nominal))}</td>
                        <td className="px-3 py-3 text-slate-600">{t.dicatatOleh || 'Bendahara'}</td>
                        <td className="px-3 py-3">
                          {t.bukti ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBukti({
                                  label: `Bukti Tabungan - ${t.tabungan?.anak?.nama || ''}`,
                                  url: keUrlBerkas(t.bukti!),
                                })
                              }
                              className="inline-flex items-center gap-1 text-[#095c51] font-semibold hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">{tgl(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History Penarikan Terverifikasi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">History Penarikan Tabungan Terverifikasi</h2>
            </div>
            <div className="p-6 text-xs text-slate-500">Belum ada history penarikan terverifikasi (akan muncul setelah verifikasi).</div>
          </div>
        </div>
      )}

      {/* TAB: PENGATURAN TARIF SPP (DINAMIS) */}
      {tab === 'tarif_spp' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pengaturan Tarif SPP Bulanan (Dinamis)</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Atur nominal tagihan SPP bulanan sekolah. Nilai ini fleksibel dan dapat diubah sewaktu-waktu oleh Bendahara.
                </p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3 text-right">
                <span className="text-[11px] text-[#095c51] font-semibold block uppercase tracking-wider">Tarif SPP Saat Ini</span>
                <span className="text-2xl font-black text-[#095c51]">{rp(tarifSpp)}</span>
                <span className="text-[10px] text-teal-600 block">/ bulan per siswa</span>
              </div>
            </div>

            <form onSubmit={handleSimpanTarifSpp} className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nominal Tarif SPP Bulanan Baru (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={inputTarifSpp}
                    onChange={(e) => setInputTarifSpp(e.target.value)}
                    placeholder="Masukkan nominal bebas, contoh: 135000"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Tarif baru akan langsung tersimpan di sistem dan digunakan untuk setiap tagihan SPP bulanan berikutnya.
                </p>
              </div>

              <button
                type="submit"
                disabled={loadingTarif}
                className="px-6 py-3 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loadingTarif ? 'Menyimpan...' : 'Simpan Perubahan Tarif SPP'}
              </button>
            </form>
          </div>

          {/* Kartu Terbitkan Tagihan SPP Bulanan Otomatis */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Penerbitan Tagihan SPP Bulanan Siswa</h2>
              <p className="text-xs text-slate-500 mt-1">
                Terbitkan tagihan SPP bulanan secara serentak untuk seluruh siswa yang berstatus aktif di TK Islam Nur Habib.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Bulan Tagihan:</label>
                <select
                  value={bulanGenerate}
                  onChange={(e) => setBulanGenerate(Number(e.target.value))}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 cursor-pointer"
                >
                  {[
                    [1, 'Januari'],
                    [2, 'Februari'],
                    [3, 'Maret'],
                    [4, 'April'],
                    [5, 'Mei'],
                    [6, 'Juni'],
                    [7, 'Juli'],
                    [8, 'Agustus'],
                    [9, 'September'],
                    [10, 'Oktober'],
                    [11, 'November'],
                    [12, 'Desember'],
                  ].map(([bNum, bName]) => (
                    <option key={bNum} value={bNum}>
                      Bulan {bNum} ({bName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateSppBulan}
                disabled={loadingTarif}
                className="mt-5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loadingTarif ? 'Menerbitkan...' : `Terbitkan SPP Bulan ke-${bulanGenerate} Sekarang`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETORAN TUNAI */}
      {tab === 'tunai' && (
        <form
          onSubmit={simpanTunai}
          className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-xl"
        >
          <h2 className="text-sm font-bold text-slate-900">Catat Setoran Tunai</h2>
          <label className="block text-xs font-semibold text-slate-600">
            Siswa
            <select
              value={idAnak}
              onChange={(e) => setIdAnak(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="">Pilih siswa…</option>
              {rekening.map((r) => (
                <option key={r.idTabungan} value={r.anak.idAnak}>
                  {r.anak.nama} — saldo {rp(Number(r.saldo))}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Nominal (Rp)
            <input
              type="number"
              min={1}
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Keterangan
            <input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Setoran tunai di kantor"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </label>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer"
          >
            Simpan Setoran
          </button>
        </form>
      )}

      {/* TAB: REKONSILIASI */}
      {tab === 'rekonsiliasi' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Rekonsiliasi 7 Hari Terakhir</h2>
            <p className="text-xs text-slate-500 mt-1">Hanya transaksi berstatus terverifikasi yang dihitung.</p>
          </div>
          {rekon.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">Belum ada transaksi terverifikasi minggu ini.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Tanggal</th>
                  <th className="text-right px-3 py-3 font-semibold">Setoran</th>
                  <th className="text-right px-3 py-3 font-semibold">Penarikan/SPP</th>
                  <th className="text-right px-6 py-3 font-semibold">Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {rekon.map((r) => (
                  <tr key={r.tanggal} className="border-t border-slate-100">
                    <td className="px-6 py-3 font-semibold text-slate-900">{r.tanggal}</td>
                    <td className="px-3 py-3 text-right text-emerald-600 font-bold">{rp(r.masuk)}</td>
                    <td className="px-3 py-3 text-right text-red-600 font-bold">{rp(r.keluar)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{r.jumlah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

        </div>
      </div>

      {/* MODAL PREVIEW BUKTI */}
      {previewBukti && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900">{previewBukti.label}</h2>
              <button
                onClick={() => setPreviewBukti(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-100 rounded-2xl min-h-[300px] flex items-center justify-center overflow-hidden">
              {previewBukti.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewBukti.url} className="w-full h-[60vh] border-0 rounded-xl" title={previewBukti.label} />
              ) : (
                <img
                  src={previewBukti.url}
                  alt={previewBukti.label}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl"
                />
              )}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={previewBukti.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Bukti</span>
              </a>
              <button
                onClick={() => setPreviewBukti(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATATAN TOLAK */}
      {showCatatanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900">Catatan Penolakan</h2>
              <button
                onClick={tutupCatatanModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">Item: {showCatatanModal.label}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alasan Penolakan *</label>
              <textarea
                value={catatanTolak}
                onChange={(e) => setCatatanTolak(e.target.value)}
                rows={4}
                placeholder="Tulis alasan penolakan di sini (wajib diisi)..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={tutupCatatanModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!catatanTolak.trim()) {
                    alert('Catatan alasan penolakan wajib diisi.');
                    return;
                  }
                  prosesVerifikasi(
                    showCatatanModal.label.toLowerCase().includes('tabungan') ? 'tabungan' : 
                    showCatatanModal.label.toLowerCase().includes('tagihan') ? 'tagihan' : 'penarikan',
                    showCatatanModal.id,
                    'tolak'
                  );
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Kuitansi Digital Resmi (PDF) */}
      <KuitansiDigitalModal
        data={kuitansiAktif}
        onClose={() => setKuitansiAktif(null)}
      />
    </div>
  );
}