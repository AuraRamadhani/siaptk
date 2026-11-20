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
  CreditCard,
  Plus,
  Trash2,
} from 'lucide-react';
import PanelJadwal from '@/components/PanelJadwal';
import PanelPendaftaranAdmin from '@/components/PanelPendaftaranAdmin';
import { useToast } from '@/components/Toast';
import KuitansiDigitalModal, { DataKuitansi } from '@/components/KuitansiDigitalModal';
import { NAMA_BULAN } from '@/lib/tagihan';
import Paginasi, { usePaginasi } from '@/components/Paginasi';
import { useDialog } from '@/components/Dialog';

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
  anak: {
    idAnak: string;
    nama: string;
    kelompok?: string | null;
    status?: string;
    keluarga?: {
      namaAyah: string | null;
      namaIbu: string | null;
      noHp?: string | null;
    } | null;
  };
  transaksi?: {
    idTransaksi: string;
    jenis: string;
    nominal: number | string;
    status: string;
    createdAt: string;
  }[];
  penarikan?: {
    idPenarikan: string;
    nominal: number | string;
    status: string;
    createdAt: string;
  }[];
};

type TagihanPending = {
  idTagihan: string;
  jenis: string;
  bulan?: number | null;
  nominal: number;
  diskon: number;
  status: string;
  anak?: { nama: string; kelompok?: string | null; keluarga?: { namaAyah: string | null; namaIbu: string | null } };
  pembayaran?: { idPembayaran: string; metode: string; buktiTransfer: string | null; diverifikasiOleh?: string | null; catatanVerifikasi?: string | null }[];
};

type PenarikanPending = {
  idPenarikan: string;
  nominal: number;
  keterangan: string | null;
  buktiTransfer?: string | null;
  status: string;
  catatanPenolakan?: string | null;
  diajukanOleh: string;
  diverifikasiOleh?: string | null;
  createdAt: string;
  tabungan?: {
    idTabungan?: string;
    saldo?: number | string;
    anak?: {
      idAnak?: string;
      nama: string;
      kelompok?: string | null;
      keluarga?: {
        namaAyah: string | null;
        namaIbu: string | null;
      };
    };
  };
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
  | 'tunai'
  | 'rekening_bank'
  | 'tarif_spp'
  | 'riwayat'
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
    label: 'Setoran / Bayar Tunai',
    icon: CircleDollarSign,
    title: 'Pencatatan Pembayaran & Setoran Tunai Langsung',
    desc: 'Input setoran tabungan, pembayaran SPP bulanan, atau biaya pendaftaran tunai bagi orang tua yang datang ke sekolah.',
  },
  {
    id: 'rekening_bank',
    label: 'Rekening Transfer',
    icon: CreditCard,
    title: 'Tujuan Transfer Resmi (TK Islam Nur Habib)',
    desc: 'Kelola nomor rekening bank resmi sekolah (BSI, BCA, Mandiri) untuk pembayaran transfer orang tua.',
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

interface PortalBendaharaProps {
  namaBendahara?: string;
}

export default function PortalBendahara({ namaBendahara }: PortalBendaharaProps = {}) {
  const { toast } = useToast();
  const { konfirmasi, beritahu } = useDialog();
  const [tab, setTab] = useState<TabBendahara>('verifikasi');
  const [antrean, setAntrean] = useState<Trx[]>([]);
  const [tagihanPending, setTagihanPending] = useState<TagihanPending[]>([]);
  const [tagihanLunas, setTagihanLunas] = useState<TagihanPending[]>([]);
  const [penarikanPending, setPenarikanPending] = useState<PenarikanPending[]>([]);
  const [penarikanSelesai, setPenarikanSelesai] = useState<PenarikanPending[]>([]);
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
  const [modalVerifikasiPenarikan, setModalVerifikasiPenarikan] = useState<PenarikanPending | null>(null);
  const [fileBuktiTransfer, setFileBuktiTransfer] = useState<File | null>(null);
  const [catatanVerifikasiPenarikan, setCatatanVerifikasiPenarikan] = useState<string>('');
  const [prosesVerifikasiLoading, setProsesVerifikasiLoading] = useState<boolean>(false);
  const [tarifSpp, setTarifSpp] = useState<number>(350000);
  const [inputTarifSpp, setInputTarifSpp] = useState<string>('350000');
  const [bulanGenerate, setBulanGenerate] = useState<number>(new Date().getMonth() + 1);
  const [loadingTarif, setLoadingTarif] = useState<boolean>(false);
  const [kuitansiAktif, setKuitansiAktif] = useState<DataKuitansi | null>(null);

  // Paginasi tiap tabel panjang supaya tidak perlu menggulir sampai bawah.
  const halTagihanPending = usePaginasi(tagihanPending);
  const halPenarikanPending = usePaginasi(penarikanPending);
  const halTagihanLunas = usePaginasi(tagihanLunas);
  const halTerverifikasi = usePaginasi(terverifikasi);
  const halPenarikanSelesai = usePaginasi(penarikanSelesai);
  const halRekening = usePaginasi(rekening);
  const halAntrean = usePaginasi(antrean);

  // State untuk Pencatatan Transaksi Tunai Langsung (SPP, Tabungan, Pendaftaran)
  const [tunaiKategori, setTunaiKategori] = useState<'TABUNGAN' | 'SPP' | 'PENDAFTARAN'>('SPP');
  const [daftarSiswaTunai, setDaftarSiswaTunai] = useState<any[]>([]);
  const [selectedTagihanSppId, setSelectedTagihanSppId] = useState<string>('');
  const [bulanSppTunai, setBulanSppTunai] = useState<number>(new Date().getMonth() + 1);
  const [loadingTunai, setLoadingTunai] = useState<boolean>(false);

  // State untuk Pengaturan Tujuan Transfer Resmi (BSI, BCA, Mandiri)
  const [rekeningList, setRekeningList] = useState<{ id: string; bank: string; nomorRekening: string; atasNama: string }[]>([]);
  const [loadingRekening, setLoadingRekening] = useState<boolean>(false);

  const muat = async () => {
    setLoading(true);
    try {
      const [a, v, r, tg, tgLunas, p, pLunas, sppRes, tunaiRes, rekRes] = await Promise.all([
        fetch('/api/tabungan?status=MENUNGGU', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/tabungan?status=DIVERIFIKASI', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/tabungan', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/tagihan?status=MENUNGGU_VERIFIKASI', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/tagihan?status=LUNAS', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/penarikan-tabungan?status=MENUNGGU', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/penarikan-tabungan?status=DIVERIFIKASI', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/pengaturan/tarif-spp', { cache: 'no-store' }).then((x) => x.json()).catch(() => ({})),
        fetch('/api/bendahara/transaksi-tunai', { cache: 'no-store' }).then((x) => x.json()).catch(() => ({})),
        fetch('/api/pengaturan/rekening', { cache: 'no-store' }).then((x) => x.json()).catch(() => ({})),
      ]);
      setAntrean(a.data || []);
      setTerverifikasi(v.data || []);
      setRekening(r.data || []);
      setTagihanPending(tg.data || []);
      setTagihanLunas(tgLunas.data || []);
      setPenarikanPending(p.data || []);
      setPenarikanSelesai(pLunas.data || []);
      if (sppRes?.success && sppRes.data?.tarif) {
        setTarifSpp(sppRes.data.tarif);
        setInputTarifSpp(String(sppRes.data.tarif));
      }
      if (tunaiRes?.success && Array.isArray(tunaiRes.data)) {
        setDaftarSiswaTunai(tunaiRes.data);
      }
      if (rekRes?.success && Array.isArray(rekRes.data)) {
        setRekeningList(rekRes.data);
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

  /** Putuskan tagihan yang berstatus menunggu verifikasi tetapi tidak punya rekaman pembayaran. */
  const putuskanTagihanTanpaBukti = async (tg: TagihanPending, statusBaru: 'LUNAS' | 'BELUM_BAYAR') => {
    const label = statusBaru === 'LUNAS' ? 'menandai LUNAS' : 'mengembalikan ke BELUM BAYAR';
    const lanjut = await konfirmasi({
      judul: 'Putuskan Tagihan Tanpa Bukti',
      pesan: `Yakin ${label} tagihan ${tg.anak?.nama || ''}? Tindakan ini tercatat sebagai keputusan bendahara.`,
      tipe: 'warning',
      labelOk: 'Lanjutkan',
    });
    if (!lanjut) return;
    try {
      const res = await fetch(`/api/tagihan/${tg.idTagihan}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusBaru }),
      }).then((x) => x.json());
      if (res.success) {
        setPesan(statusBaru === 'LUNAS' ? 'Tagihan ditandai lunas.' : 'Tagihan dikembalikan ke belum bayar.');
        muat();
      } else {
        setPesan(res.error || 'Gagal memproses.');
      }
    } catch {
      setPesan('Terjadi kesalahan.');
    }
  };

  const submitVerifikasiPenarikan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVerifikasiPenarikan) return;

    setProsesVerifikasiLoading(true);
    try {
      const formData = new FormData();
      formData.append('idPenarikan', modalVerifikasiPenarikan.idPenarikan);
      formData.append('aksi', 'verifikasi');
      if (catatanVerifikasiPenarikan) {
        formData.append('catatanVerifikasi', catatanVerifikasiPenarikan);
      }
      if (fileBuktiTransfer) {
        formData.append('buktiTransfer', fileBuktiTransfer);
      }

      const res = await fetch('/api/penarikan-tabungan', {
        method: 'PATCH',
        body: formData,
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Penarikan tabungan berhasil diverifikasi.');
        setModalVerifikasiPenarikan(null);
        setFileBuktiTransfer(null);
        setCatatanVerifikasiPenarikan('');
        muat();
      } else {
        toast.error(res.error || 'Gagal memverifikasi penarikan.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses verifikasi penarikan.');
    } finally {
      setProsesVerifikasiLoading(false);
    }
  };

  const handleSimpanTransaksiTunai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAnak) {
      toast.warning('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    const nom = Number(nominal);
    if (!nom || nom <= 0) {
      toast.warning('Nominal transaksi harus lebih dari 0.');
      return;
    }

    setLoadingTunai(true);
    try {
      const res = await fetch('/api/bendahara/transaksi-tunai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAnak,
          kategori: tunaiKategori,
          nominal: nom,
          idTagihan: selectedTagihanSppId || undefined,
          bulanSpp: bulanSppTunai,
          keterangan: keterangan || undefined,
        }),
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Transaksi tunai berhasil disimpan.');
        setPesan(res.message);
        setNominal('');
        setKeterangan('');
        setSelectedTagihanSppId('');
        muat();
      } else {
        toast.error(res.error || 'Gagal menyimpan transaksi tunai.');
        setPesan(res.error);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses transaksi tunai.');
      setPesan('Terjadi kesalahan.');
    } finally {
      setLoadingTunai(false);
    }
  };

  const ubahRekeningBank = (index: number, field: 'bank' | 'nomorRekening' | 'atasNama', value: string) => {
    setRekeningList((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const tambahRekeningBank = () => {
    setRekeningList((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        bank: '',
        nomorRekening: '',
        atasNama: 'TK Islam Nur Habib',
      },
    ]);
  };

  const hapusRekeningBank = (index: number) => {
    if (rekeningList.length <= 1) {
      toast.warning('Minimal harus ada 1 rekening tujuan transfer.');
      return;
    }
    setRekeningList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSimpanRekeningBank = async () => {
    for (const r of rekeningList) {
      if (!r.bank.trim() || !r.nomorRekening.trim() || !r.atasNama.trim()) {
        toast.warning('Semua field nama bank, nomor rekening, dan atas nama wajib diisi.');
        return;
      }
    }

    setLoadingRekening(true);
    try {
      const res = await fetch('/api/pengaturan/rekening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rekening: rekeningList }),
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Pengaturan rekening tujuan transfer berhasil disimpan.');
        setPesan(res.message);
      } else {
        toast.error(res.error || 'Gagal menyimpan rekening.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan rekening.');
    } finally {
      setLoadingRekening(false);
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
    const lanjut = await konfirmasi({
      judul: 'Terbitkan Tagihan SPP',
      pesan: `Terbitkan tagihan SPP bulan ${bulanGenerate} ke seluruh siswa aktif? Tagihan yang sudah ada tidak akan digandakan.`,
      tipe: 'info',
      labelOk: 'Terbitkan',
    });
    if (!lanjut) return;
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
              if (t.id === 'riwayat') badge = tagihanLunas.length + terverifikasi.length + penarikanSelesai.length;

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
                  {halAntrean.data.map((t) => (
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
          <Paginasi
            halaman={halAntrean.halaman}
            totalHalaman={halAntrean.totalHalaman}
            total={halAntrean.total}
            perHalaman={halAntrean.perHalaman}
            mulai={halAntrean.mulai}
            onHalaman={halAntrean.setHalaman}
            onPerHalaman={halAntrean.gantiPerHalaman}
            satuan="setoran"
          />
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
                  {halTagihanPending.data.map((tg) => {
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
                            // Tagihan bisa berstatus menunggu verifikasi tanpa rekaman pembayaran
                            // (mis. status diubah manual). Tetap beri jalan keluar agar tidak buntu.
                            <>
                              <button
                                onClick={() => putuskanTagihanTanpaBukti(tg, 'LUNAS')}
                                className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                                title="Tandai lunas tanpa bukti transfer"
                              >
                                Tandai Lunas
                              </button>
                              <button
                                onClick={() => putuskanTagihanTanpaBukti(tg, 'BELUM_BAYAR')}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold cursor-pointer"
                                title="Kembalikan ke belum bayar"
                              >
                                Kembalikan
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginasi
            halaman={halTagihanPending.halaman}
            totalHalaman={halTagihanPending.totalHalaman}
            total={halTagihanPending.total}
            perHalaman={halTagihanPending.perHalaman}
            mulai={halTagihanPending.mulai}
            onHalaman={halTagihanPending.setHalaman}
            onPerHalaman={halTagihanPending.gantiPerHalaman}
            satuan="tagihan"
          />
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
                  {halPenarikanPending.data.map((p) => (
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
                          onClick={() => {
                            setModalVerifikasiPenarikan(p);
                            setFileBuktiTransfer(null);
                            setCatatanVerifikasiPenarikan('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                        >
                          Verifikasi & Upload Bukti
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
          <Paginasi
            halaman={halPenarikanPending.halaman}
            totalHalaman={halPenarikanPending.totalHalaman}
            total={halPenarikanPending.total}
            perHalaman={halPenarikanPending.perHalaman}
            mulai={halPenarikanPending.mulai}
            onHalaman={halPenarikanPending.setHalaman}
            onPerHalaman={halPenarikanPending.gantiPerHalaman}
            satuan="penarikan"
          />
        </div>
      )}

      {/* TAB: JADWAL KUNJUNGAN */}
      {tab === 'jadwal' && <PanelJadwal />}

      {/* TAB: PENDAFTARAN ONSITE */}
      {tab === 'onsite' && <PanelPendaftaranAdmin onSukses={muat} />}

      {/* TAB: RIWAYAT TERVERIFIKASI */}
      {tab === 'riwayat' && (
        <div className="space-y-6">
          {/* STATISTIK RINGKASAN SINKRONISASI KEBERLANJUTAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#095c51] shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tagihan Lunas</p>
                <h3 className="text-xl font-black text-slate-900 truncate">
                  {tagihanLunas.length} Tagihan
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold truncate">
                  {rp(tagihanLunas.reduce((acc, tg) => acc + (Number(tg.nominal) - Number(tg.diskon || 0)), 0))}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Tabungan Siswa</p>
                <h3 className="text-xl font-black text-emerald-700 truncate">{rp(totalSaldo)}</h3>
                <p className="text-[11px] text-slate-500 font-medium truncate">{rekening.length} Rekening Aktif</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Penarikan Disetujui</p>
                <h3 className="text-xl font-black text-slate-900 truncate">{penarikanSelesai.length} Penarikan</h3>
                <p className="text-[11px] text-red-600 font-bold truncate">
                  {rp(penarikanSelesai.reduce((acc, p) => acc + Number(p.nominal), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* SINKRONISASI SALDO TABUNGAN PER SISWA */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#095c51]" />
                  <span>Daftar Saldo Tabungan Siswa (Sinkron Realtime)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saldo rekening tabungan otomatis tersinkron dengan setoran terverifikasi dan penarikan yang telah disetujui.
                </p>
              </div>
              <button
                type="button"
                onClick={muat}
                disabled={loading}
                className="text-xs font-semibold text-[#095c51] hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Muat Ulang</span>
              </button>
            </div>
            {rekening.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada rekening tabungan siswa terdaftar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Nama Siswa</th>
                      <th className="text-left px-3 py-3 font-semibold">Kelompok / Kelas</th>
                      <th className="text-left px-3 py-3 font-semibold">Orang Tua / Wali</th>
                      <th className="text-right px-3 py-3 font-semibold">Setoran Terverifikasi</th>
                      <th className="text-right px-3 py-3 font-semibold">Penarikan Disetujui</th>
                      <th className="text-right px-6 py-3 font-semibold">Saldo Akhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halRekening.data.map((r) => {
                      const totalSetor = (r.transaksi || [])
                        .filter((tx) => tx.jenis === 'SETOR')
                        .reduce((acc, tx) => acc + Number(tx.nominal), 0);
                      const totalTarik = (r.penarikan || [])
                        .reduce((acc, px) => acc + Number(px.nominal), 0);

                      return (
                        <tr key={r.idTabungan} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3 font-bold text-slate-900">
                            {r.anak.nama}
                            <span className="block text-[10px] font-normal text-slate-400">
                              ID: {r.idTabungan.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {r.anak.kelompok || 'Belum Ada'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {r.anak.keluarga?.namaAyah || r.anak.keluarga?.namaIbu || '—'}
                            {r.anak.keluarga?.noHp && (
                              <span className="block text-[10px] text-slate-400">{r.anak.keluarga.noHp}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-emerald-600">
                            {totalSetor > 0 ? `+ ${rp(totalSetor)}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-red-600">
                            {totalTarik > 0 ? `- ${rp(totalTarik)}` : '—'}
                          </td>
                          <td className="px-6 py-3 text-right font-black text-slate-900 text-sm">
                            <span className="inline-block px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-[#095c51]">
                              {rp(Number(r.saldo))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Paginasi
              halaman={halRekening.halaman}
              totalHalaman={halRekening.totalHalaman}
              total={halRekening.total}
              perHalaman={halRekening.perHalaman}
              mulai={halRekening.mulai}
              onHalaman={halRekening.setHalaman}
              onPerHalaman={halRekening.gantiPerHalaman}
              satuan="rekening"
            />
          </div>

          {/* History Pembayaran Tagihan Terverifikasi / Lunas */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">History Pembayaran Tagihan Terverifikasi (Lunas)</h2>
                <p className="text-xs text-slate-500 mt-0.5">{tagihanLunas.length} pembayaran tagihan sudah lunas.</p>
              </div>
              <button onClick={muat} className="text-xs font-semibold text-[#095c51] hover:underline cursor-pointer">
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
                      <th className="text-right px-6 py-3 font-semibold">Status & Kuitansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halTagihanLunas.data.map((tg) => {
                      const bayar = tg.pembayaran?.[tg.pembayaran.length - 1];
                      return (
                        <tr key={tg.idTagihan} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
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
                                  namaBendahara: namaBendahara || bayar?.diverifikasiOleh || 'Bendahara',
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
            <Paginasi
              halaman={halTagihanLunas.halaman}
              totalHalaman={halTagihanLunas.totalHalaman}
              total={halTagihanLunas.total}
              perHalaman={halTagihanLunas.perHalaman}
              mulai={halTagihanLunas.mulai}
              onHalaman={halTagihanLunas.setHalaman}
              onPerHalaman={halTagihanLunas.gantiPerHalaman}
              satuan="tagihan lunas"
            />
          </div>

          {/* History Transaksi Tabungan Terverifikasi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">History Transaksi Tabungan Terverifikasi</h2>
                <p className="text-xs text-slate-500 mt-0.5">{terverifikasi.length} transaksi tabungan terverifikasi.</p>
              </div>
              <button onClick={muat} className="text-xs font-semibold text-[#095c51] hover:underline cursor-pointer">
                Muat ulang
              </button>
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
                      <th className="text-left px-3 py-3 font-semibold">Waktu</th>
                      <th className="text-right px-6 py-3 font-semibold">Kuitansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halTerverifikasi.data.map((t) => {
                      const isTarik = t.jenis === 'TARIK';
                      return (
                        <tr key={t.idTransaksi} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {t.tabungan?.anak?.nama || '-'}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {t.tabungan?.anak?.keluarga?.namaAyah || t.tabungan?.anak?.keluarga?.namaIbu || ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <span className="font-semibold">{LABEL[t.jenis] || t.jenis} · {t.metode}</span>
                            {t.keterangan && <span className="block text-[11px] text-slate-400">{t.keterangan}</span>}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-black ${
                              isTarik ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isTarik ? `- ${rp(Number(t.nominal))}` : `+ ${rp(Number(t.nominal))}`}
                          </td>
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
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{tgl(t.createdAt)}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setKuitansiAktif({
                                  noKuitansi: `KWT-TBG/${new Date(t.createdAt).getFullYear()}/${t.idTransaksi.slice(-6).toUpperCase()}`,
                                  tanggal: new Date(t.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }),
                                  namaSiswa: t.tabungan?.anak?.nama || 'Siswa',
                                  kelompok: null,
                                  namaWali: t.tabungan?.anak?.keluarga?.namaAyah || t.tabungan?.anak?.keluarga?.namaIbu || null,
                                  jenisPembayaran: t.jenis === 'SETOR' ? 'Setoran Tabungan Siswa' : 'Penarikan Tabungan Siswa',
                                  periode: null,
                                  nominal: Number(t.nominal),
                                  metodePembayaran: `${t.metode} (${LABEL[t.jenis] || t.jenis})`,
                                  status: 'LUNAS',
                                  keterangan: t.keterangan || (t.jenis === 'SETOR' ? 'Setoran tabungan telah diverifikasi bendahara.' : 'Penarikan tabungan telah disetujui bendahara.'),
                                  namaBendahara: namaBendahara || t.dicatatOleh || 'Bendahara',
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
            <Paginasi
              halaman={halTerverifikasi.halaman}
              totalHalaman={halTerverifikasi.totalHalaman}
              total={halTerverifikasi.total}
              perHalaman={halTerverifikasi.perHalaman}
              mulai={halTerverifikasi.mulai}
              onHalaman={halTerverifikasi.setHalaman}
              onPerHalaman={halTerverifikasi.gantiPerHalaman}
              satuan="transaksi"
            />
          </div>

          {/* History Penarikan Terverifikasi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">History Penarikan Tabungan Terverifikasi</h2>
                <p className="text-xs text-slate-500 mt-0.5">{penarikanSelesai.length} pengajuan penarikan telah disetujui.</p>
              </div>
              <button onClick={muat} className="text-xs font-semibold text-[#095c51] hover:underline cursor-pointer">
                Muat ulang
              </button>
            </div>
            {penarikanSelesai.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada history penarikan tabungan yang diverifikasi.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Siswa & Orang Tua</th>
                      <th className="text-right px-3 py-3 font-semibold">Nominal Ditarik</th>
                      <th className="text-left px-3 py-3 font-semibold">Keterangan</th>
                      <th className="text-left px-3 py-3 font-semibold">Diajukan Oleh</th>
                      <th className="text-left px-3 py-3 font-semibold">Diverifikasi Oleh</th>
                      <th className="text-left px-3 py-3 font-semibold">Bukti Transfer</th>
                      <th className="text-left px-3 py-3 font-semibold">Waktu</th>
                      <th className="text-right px-6 py-3 font-semibold">Status & Kuitansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halPenarikanSelesai.data.map((p) => {
                      const namaSiswa = p.tabungan?.anak?.nama || 'Siswa';
                      const namaWali = p.tabungan?.anak?.keluarga?.namaAyah || p.tabungan?.anak?.keluarga?.namaIbu || null;
                      return (
                        <tr key={p.idPenarikan} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {namaSiswa}
                            {namaWali && <span className="block text-[10px] font-normal text-slate-400">Wali: {namaWali}</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-red-600">
                            - {rp(Number(p.nominal))}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {p.keterangan || 'Penarikan saldo tabungan'}
                          </td>
                          <td className="px-3 py-3 text-slate-600">{p.diajukanOleh || 'Orang Tua'}</td>
                          <td className="px-3 py-3 text-slate-600">{p.diverifikasiOleh || 'Bendahara'}</td>
                          <td className="px-3 py-3">
                            {p.buktiTransfer ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewBukti({
                                    label: `Bukti Transfer Penarikan - ${namaSiswa}`,
                                    url: keUrlBerkas(p.buktiTransfer!),
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[#095c51] font-semibold hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Bukti</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Tunai / Tanpa file</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{tgl(p.createdAt)}</td>
                          <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              DISETUJUI
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setKuitansiAktif({
                                  noKuitansi: `KWT-TRK/${new Date(p.createdAt).getFullYear()}/${p.idPenarikan.slice(-6).toUpperCase()}`,
                                  tanggal: new Date(p.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }),
                                  namaSiswa: namaSiswa,
                                  kelompok: p.tabungan?.anak?.kelompok || null,
                                  namaWali: namaWali,
                                  jenisPembayaran: 'Penarikan Tabungan Siswa',
                                  periode: null,
                                  nominal: Number(p.nominal),
                                  metodePembayaran: p.buktiTransfer ? 'Transfer Bank (TF)' : 'Tunai di Kantor Sekolah',
                                  status: 'LUNAS',
                                  keterangan: p.keterangan || (p.buktiTransfer ? 'Penarikan tabungan telah ditransfer ke rekening orang tua oleh Bendahara.' : 'Penarikan tabungan telah disetujui dan diserahkan tunai oleh Bendahara.'),
                                  namaBendahara: namaBendahara || p.diverifikasiOleh || 'Bendahara',
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
            <Paginasi
              halaman={halPenarikanSelesai.halaman}
              totalHalaman={halPenarikanSelesai.totalHalaman}
              total={halPenarikanSelesai.total}
              perHalaman={halPenarikanSelesai.perHalaman}
              mulai={halPenarikanSelesai.mulai}
              onHalaman={halPenarikanSelesai.setHalaman}
              onPerHalaman={halPenarikanSelesai.gantiPerHalaman}
              satuan="penarikan"
            />
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

      {/* TAB: SETORAN / PEMBAYARAN TUNAI LANGSUNG */}
      {tab === 'tunai' && (() => {
        const anakTerpilih = daftarSiswaTunai.find((s) => s.idAnak === idAnak);
        const unpaidSpp = anakTerpilih?.tagihan?.filter((t: any) => t.jenis === 'SPP' && t.status !== 'LUNAS') || [];
        const pendaftaranTagihan = anakTerpilih?.tagihan?.find((t: any) => t.jenis === 'PENDAFTARAN');
        const pendaftaranSudahLunas = pendaftaranTagihan?.status === 'LUNAS';

        return (
          <div className="grid md:grid-cols-3 gap-6">
            <form
              onSubmit={handleSimpanTransaksiTunai}
              className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Formulir Penerimaan Kas Tunai Langsung</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catat transaksi penerimaan uang tunai di loket kasir sekolah (SPP, Tabungan, atau Biaya Pendaftaran). Data langsung tersinkronkan ke portal orang tua.
                </p>
              </div>

              {/* Pilihan Kategori Transaksi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Pilih Jenis Transaksi Tunai *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTunaiKategori('SPP');
                      if (unpaidSpp.length > 0) {
                        setSelectedTagihanSppId(unpaidSpp[0].idTagihan);
                        setNominal(String(unpaidSpp[0].nominal));
                      } else {
                        setNominal(String(tarifSpp || 135000));
                      }
                      setKeterangan('Pembayaran SPP tunai langsung di sekolah');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      tunaiKategori === 'SPP'
                        ? 'bg-emerald-50 border-[#095c51] text-[#095c51] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>SPP Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTunaiKategori('TABUNGAN');
                      setNominal('50000');
                      setKeterangan('Setoran tabungan tunai di kantor sekolah');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      tunaiKategori === 'TABUNGAN'
                        ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Tabungan Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTunaiKategori('PENDAFTARAN');
                      setNominal('1570000');
                      setKeterangan('Pembayaran biaya pendaftaran tunai di sekolah');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      tunaiKategori === 'PENDAFTARAN'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Biaya Pendaftaran</span>
                  </button>
                </div>
              </div>

              {/* Pilih Siswa */}
              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Nama Siswa *</span>
                <select
                  value={idAnak}
                  onChange={(e) => {
                    const id = e.target.value;
                    setIdAnak(id);
                    const selected = daftarSiswaTunai.find((s) => s.idAnak === id);
                    if (selected) {
                      const unSpp = selected.tagihan?.filter((t: any) => t.jenis === 'SPP' && t.status !== 'LUNAS') || [];
                      if (tunaiKategori === 'SPP') {
                        if (unSpp.length > 0) {
                          setSelectedTagihanSppId(unSpp[0].idTagihan);
                          setNominal(String(unSpp[0].nominal));
                        } else {
                          setSelectedTagihanSppId('');
                          setNominal(String(tarifSpp || 135000));
                        }
                      } else if (tunaiKategori === 'PENDAFTARAN') {
                        setNominal('1570000');
                      } else if (tunaiKategori === 'TABUNGAN') {
                        setNominal('50000');
                      }
                    }
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-[#095c51]"
                >
                  <option value="">— Pilih siswa penerima pembayaran —</option>
                  {daftarSiswaTunai.map((s) => (
                    <option key={s.idAnak} value={s.idAnak}>
                      {s.nama} ({s.kelompok}) — Ortu: {s.namaOrangTua}
                    </option>
                  ))}
                </select>
              </label>

              {/* Sub-pilihan jika SPP */}
              {tunaiKategori === 'SPP' && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Tagihan SPP yang Dibayar:</span>
                    {unpaidSpp.length > 0 ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {unpaidSpp.length} tagihan belum lunas
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Semua SPP terdaftar lunas
                      </span>
                    )}
                  </div>
                  {unpaidSpp.length > 0 ? (
                    <select
                      value={selectedTagihanSppId}
                      onChange={(e) => {
                        setSelectedTagihanSppId(e.target.value);
                        const t = unpaidSpp.find((x: any) => x.idTagihan === e.target.value);
                        if (t) setNominal(String(t.nominal));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      {unpaidSpp.map((t: any) => (
                        <option key={t.idTagihan} value={t.idTagihan}>
                          SPP {t.labelBulan || `Bulan ${t.bulan}`} — Rp {Number(t.nominal).toLocaleString('id-ID')} ({t.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block">
                        Belum ada tagihan SPP gantung. Pilih bulan SPP yang ingin dibayar langsung:
                      </span>
                      <select
                        value={bulanSppTunai}
                        onChange={(e) => setBulanSppTunai(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((b) => (
                          <option key={b} value={b}>
                            SPP Bulan {NAMA_BULAN[b] || b} (Rp {tarifSpp.toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-info jika Biaya Pendaftaran */}
              {tunaiKategori === 'PENDAFTARAN' && (
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1 text-xs">
                  <div className="font-bold text-amber-900">Status Biaya Pendaftaran Calon Siswa:</div>
                  <div className="text-[11px] text-amber-800">
                    {pendaftaranSudahLunas
                      ? `✓ Pendaftaran untuk ${anakTerpilih?.nama || 'siswa ini'} sudah LUNAS.`
                      : `Biaya pendaftaran standar: Rp 1.570.000. Pembayaran tunai ini akan langsung mengubah tagihan menjadi LUNAS dan mengaktifkan status siswa.`}
                  </div>
                </div>
              )}

              {/* Sub-info jika Tabungan */}
              {tunaiKategori === 'TABUNGAN' && (
                <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200 space-y-1 text-xs">
                  <div className="font-bold text-teal-900">Saldo Tabungan Saat Ini:</div>
                  <div className="text-base font-extrabold text-[#095c51]">
                    {anakTerpilih ? rp(anakTerpilih.saldoTabungan) : '—'}
                  </div>
                  <p className="text-[10px] text-teal-700">
                    Uang setoran tunai akan langsung ditambahkan ke saldo tabungan dan tercatat di mutasi rekening portal orang tua.
                  </p>
                </div>
              )}

              {/* Nominal & Keterangan */}
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Nominal Pembayaran / Setoran (Rp) *</span>
                  <input
                    type="number"
                    min={1}
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-[#095c51]"
                    placeholder="Contoh: 135000"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Keterangan Transaksi</span>
                  <input
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder={
                      tunaiKategori === 'SPP'
                        ? 'Pembayaran SPP tunai di loket'
                        : tunaiKategori === 'PENDAFTARAN'
                        ? 'Pembayaran pendaftaran tunai'
                        : 'Setoran tabungan tunai di kantor'
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-[#095c51]"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loadingTunai || !idAnak}
                  className="px-6 py-3 rounded-2xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <CircleDollarSign className="w-4 h-4" />
                  <span>
                    {loadingTunai
                      ? 'Menyimpan...'
                      : tunaiKategori === 'SPP'
                      ? 'Simpan Pembayaran SPP Tunai'
                      : tunaiKategori === 'PENDAFTARAN'
                      ? 'Simpan Pembayaran Pendaftaran Tunai'
                      : 'Simpan Setoran Tabungan Tunai'}
                  </span>
                </button>
              </div>
            </form>

            {/* Sidebar Ringkasan Info Siswa Terpilih */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4 h-fit">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Informasi Keuangan Siswa
              </h3>
              {anakTerpilih ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[11px] text-slate-400">Nama Lengkap</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{anakTerpilih.nama}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Kelompok: <strong className="text-slate-700">{anakTerpilih.kelompok}</strong> · Status: {anakTerpilih.status}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Orang Tua: <strong className="text-slate-700">{anakTerpilih.namaOrangTua}</strong> ({anakTerpilih.noHp})
                    </div>
                  </div>

                  <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100">
                    <div className="text-[11px] text-teal-700 font-semibold">Saldo Tabungan Saat Ini</div>
                    <div className="text-lg font-extrabold text-[#095c51] mt-0.5">{rp(anakTerpilih.saldoTabungan)}</div>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <div className="text-[11px] text-amber-800 font-semibold">Status Pendaftaran</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {pendaftaranSudahLunas ? '✓ LUNAS' : 'Belum Lunas'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-600">Daftar Tagihan SPP Siswa:</div>
                    {anakTerpilih.tagihan?.filter((t: any) => t.jenis === 'SPP').length === 0 ? (
                      <div className="text-[11px] text-slate-400">Belum ada tagihan SPP.</div>
                    ) : (
                      anakTerpilih.tagihan
                        ?.filter((t: any) => t.jenis === 'SPP')
                        .map((t: any) => (
                          <div key={t.idTagihan} className="flex items-center justify-between text-[11px] border-b border-slate-200/60 pb-1">
                            <span>SPP {t.labelBulan || `Bln ${t.bulan}`}</span>
                            <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${
                              t.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 p-4 text-center">
                  Pilih siswa pada formulir untuk melihat rincian saldo dan tagihan.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB: PENGATURAN TUJUAN TRANSFER RESMI */}
      {tab === 'rekening_bank' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Tujuan Transfer Resmi (TK Islam Nur Habib)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nomor rekening bank di bawah ini akan ditampilkan secara otomatis kepada seluruh orang tua siswa di portal pembayaran saat transfer SPP, tabungan, atau pendaftaran.
                </p>
              </div>
              <button
                type="button"
                onClick={tambahRekeningBank}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-[#095c51] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bank / Rekening</span>
              </button>
            </div>

            <div className="space-y-4">
              {rekeningList.map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#095c51] uppercase tracking-wider">
                      Rekening Bank #{idx + 1}
                    </span>
                    {rekeningList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => hapusRekeningBank(idx)}
                        className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <label className="block text-xs font-semibold text-slate-700 space-y-1">
                      <span>Nama Bank *</span>
                      <input
                        value={r.bank}
                        onChange={(e) => ubahRekeningBank(idx, 'bank', e.target.value)}
                        placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-[#095c51]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700 space-y-1">
                      <span>Nomor Rekening *</span>
                      <input
                        value={r.nomorRekening}
                        onChange={(e) => ubahRekeningBank(idx, 'nomorRekening', e.target.value)}
                        placeholder="Contoh: 7123-4567-89"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-[#095c51]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700 space-y-1">
                      <span>Atas Nama (Pemilik Rekening) *</span>
                      <input
                        value={r.atasNama}
                        onChange={(e) => ubahRekeningBank(idx, 'atasNama', e.target.value)}
                        placeholder="Contoh: TK Islam Nur Habib"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-[#095c51]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSimpanRekeningBank}
                disabled={loadingRekening}
                className="px-6 py-3 bg-[#095c51] hover:bg-[#074840] text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>{loadingRekening ? 'Menyimpan...' : 'Simpan Perubahan Rekening'}</span>
              </button>
            </div>
          </div>
        </div>
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
                onClick={async () => {
                  if (!catatanTolak.trim()) {
                    await beritahu('Catatan alasan penolakan wajib diisi sebelum menolak.', {
                      judul: 'Alasan Belum Diisi',
                      tipe: 'warning',
                    });
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
      {/* MODAL VERIFIKASI PENARIKAN TABUNGAN DENGAN UPLOAD BUKTI TRANSFER */}
      {modalVerifikasiPenarikan && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Verifikasi Penarikan Tabungan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload bukti transfer bank bahwa uang telah dikirim ke rekening orang tua.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalVerifikasiPenarikan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitVerifikasiPenarikan} className="space-y-4">
              {/* Rincian Penarikan Siswa */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-900">{modalVerifikasiPenarikan.tabungan?.anak?.nama || 'Siswa'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Orang Tua / Wali:</span>
                  <span className="font-medium text-slate-800">
                    {modalVerifikasiPenarikan.tabungan?.anak?.keluarga?.namaAyah || modalVerifikasiPenarikan.tabungan?.anak?.keluarga?.namaIbu || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nominal Penarikan:</span>
                  <span className="font-black text-rose-600 text-sm">{rp(Number(modalVerifikasiPenarikan.nominal))}</span>
                </div>
                {modalVerifikasiPenarikan.keterangan && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Tujuan Rekening / Catatan Ortu:</span>
                    <span className="font-medium text-teal-800 bg-teal-50 px-2 py-1 rounded-lg block mt-0.5">
                      {modalVerifikasiPenarikan.keterangan}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Bukti Uang Sudah Ditransfer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Bukti Transfer / Kirim Uang (JPG, PNG, atau PDF) *
                </label>
                <div className="mt-1 border-2 border-dashed border-teal-200 bg-teal-50/40 rounded-2xl p-4 text-center hover:bg-teal-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileBuktiTransfer(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Banknote className="w-8 h-8 text-[#095c51]" />
                    <span className="text-xs font-semibold text-slate-700">
                      {fileBuktiTransfer ? fileBuktiTransfer.name : 'Pilih file bukti transfer (JPG, PNG, atau PDF)'}
                    </span>
                    <span className="text-[10px] text-slate-400">Ukuran maksimal file 5 MB</span>
                  </div>
                </div>
                {fileBuktiTransfer && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-teal-100/70 text-[#095c51] text-xs font-semibold">
                    <span className="truncate max-w-[280px]">File terpilih: {fileBuktiTransfer.name}</span>
                    <button
                      type="button"
                      onClick={() => setFileBuktiTransfer(null)}
                      className="text-red-600 hover:underline text-[11px] cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {/* Catatan Verifikasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Keterangan / Catatan Verifikasi (Opsional)
                </label>
                <input
                  type="text"
                  value={catatanVerifikasiPenarikan}
                  onChange={(e) => setCatatanVerifikasiPenarikan(e.target.value)}
                  placeholder="Misal: Sudah ditransfer via Bank Mandiri / BCA a.n..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalVerifikasiPenarikan(null)}
                  disabled={prosesVerifikasiLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={prosesVerifikasiLoading}
                  className="px-5 py-2 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {prosesVerifikasiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Konfirmasi & Simpan Bukti</span>
                  )}
                </button>
              </div>
            </form>
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