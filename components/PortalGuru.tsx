'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

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
  Pencil,
  Check,
  RotateCcw,
  UserCheck,
  Camera,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Info,
  HeartHandshake,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';
import { useToast } from '@/components/Toast';

type KodeKelas = 'KB' | 'A' | 'B';
type FilterKelas = 'SEMUA' | KodeKelas;

export type SubtemaHarian = {
  hari: string;
  tanggal?: string;
  subtema: string;
  kegiatan: string;
};

export type Tema = {
  idTema: string;
  namaTema: string;
  mingguKe: number;
  periode?: string | null;
  subtemaHarian?: string | SubtemaHarian[] | null;
};

type RiwayatKelompokItem = { idRiwayat: string; kelompok: { idKelompok: string; nama: string } };
type Anak = {
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  keluarga?: { namaAyah: string | null; namaIbu: string | null };
  riwayatKelompok?: RiwayatKelompokItem[];
};

export type NilaiKategori = 'BB' | 'MB' | 'BSH' | 'BSB';

export type AspekPenilaian = {
  aspek: string;
  indikator: string;
  hasil: NilaiKategori;
  catatan: string;
};

export type DetailLaporanMingguan = {
  versi: string;
  guru: string;
  periode: string;
  subtema: string;
  rekapHarian: SubtemaHarian[];
  aspekPerkembangan: AspekPenilaian[];
  catatanPerkembangan: string;
  rekomendasiRumah: string;
  fotoAktivitas?: string | null;
};

type Laporan = {
  idLaporan: string;
  aspek: string;
  catatanKegiatan: string;
  fotoAktivitas?: string | null;
  detailLaporan?: DetailLaporanMingguan | null;
  anak: {
    idAnak: string;
    nama: string;
    tglLahir?: string;
    riwayatKelompok?: RiwayatKelompokItem[];
  };
  tema: { idTema: string; namaTema: string; mingguKe: number; periode?: string | null; subtemaHarian?: any };
};

const HARI_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

const DEFAULT_SUBTEMA_HARIAN: SubtemaHarian[] = [
  { hari: 'Senin', tanggal: '', subtema: '', kegiatan: '' },
  { hari: 'Selasa', tanggal: '', subtema: '', kegiatan: '' },
  { hari: 'Rabu', tanggal: '', subtema: '', kegiatan: '' },
  { hari: 'Kamis', tanggal: '', subtema: '', kegiatan: '' },
  { hari: 'Jumat', tanggal: '', subtema: '', kegiatan: '' },
];

const DEFAULT_ASPEK_LIST: AspekPenilaian[] = [
  {
    aspek: 'Nilai Agama dan Moral',
    indikator: 'Menunjukkan rasa sayang terhadap ciptaan Allah dan perilaku bersyukur',
    hasil: 'BSH',
    catatan: '',
  },
  {
    aspek: 'Bahasa',
    indikator: 'Mampu menyebutkan kosakata baru dan menceritakan kembali kegiatan',
    hasil: 'BSH',
    catatan: '',
  },
  {
    aspek: 'Kognitif',
    indikator: 'Mengenal konsep klasifikasi, warna, bentuk, dan pemecahan masalah',
    hasil: 'BSH',
    catatan: '',
  },
  {
    aspek: 'Motorik Halus',
    indikator: 'Koordinasi tangan dan mata (mewarnai, menggunting, menempel/kolase)',
    hasil: 'BSH',
    catatan: '',
  },
  {
    aspek: 'Sosial-Emosional',
    indikator: 'Bekerja sama dengan teman, mandiri, dan mau berbagi alat belajar',
    hasil: 'BSH',
    catatan: '',
  },
];

const KETERANGAN_KATEGORI: Record<NilaiKategori, { label: string; desc: string; badge: string }> = {
  BB: { label: 'BB', desc: 'Belum Berkembang', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  MB: { label: 'MB', desc: 'Mulai Berkembang', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  BSH: { label: 'BSH', desc: 'Berkembang Sesuai Harapan', badge: 'bg-teal-100 text-[#095c51] border-teal-300' },
  BSB: { label: 'BSB', desc: 'Berkembang Sangat Baik', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

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

function parseSubtemaHarian(val: any): SubtemaHarian[] {
  if (!val) return DEFAULT_SUBTEMA_HARIAN;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // bukan JSON
    }
  }
  return DEFAULT_SUBTEMA_HARIAN;
}

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
    desc: 'Dokumentasikan evaluasi terstruktur siswa meliputi rekap kegiatan Senin-Jumat, 5 aspek perkembangan, dan rekomendasi orang tua.',
  },
  kelas: {
    title: 'Kelompok Kelas (KB, TK A, TK B)',
    desc: 'Pantau pembagian rombongan belajar siswa aktif dan buat laporan perkembangan secara cepat.',
  },
  tema: {
    title: 'Tema Pembelajaran & Subtema Harian',
    desc: 'Atur agenda kurikulum mingguan lengkap dengan rincian subtema dan kegiatan per hari (Senin s.d. Jumat).',
  },
};

interface PortalGuruProps {
  namaGuru?: string;
}

function formatRentangTanggal(mulaiStr?: string, selesaiStr?: string): string {
  if (!mulaiStr && !selesaiStr) return '';
  if (mulaiStr && !selesaiStr) {
    const d = new Date(mulaiStr);
    return isNaN(d.getTime()) ? mulaiStr : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (!mulaiStr && selesaiStr) {
    const d = new Date(selesaiStr);
    return isNaN(d.getTime()) ? selesaiStr : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d1 = new Date(mulaiStr!);
  const d2 = new Date(selesaiStr!);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return `${mulaiStr} – ${selesaiStr}`;

  const bulan1 = d1.toLocaleDateString('id-ID', { month: 'short' });
  const bulan2 = d2.toLocaleDateString('id-ID', { month: 'short' });
  const tahun1 = d1.getFullYear();
  const tahun2 = d2.getFullYear();

  if (tahun1 === tahun2 && bulan1 === bulan2) {
    return `${d1.getDate()}–${d2.getDate()} ${d1.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
  }
  if (tahun1 === tahun2) {
    return `${d1.getDate()} ${bulan1} – ${d2.getDate()} ${bulan2} ${tahun1}`;
  }
  return `${d1.getDate()} ${bulan1} ${tahun1} – ${d2.getDate()} ${bulan2} ${tahun2}`;
}

function tambahHariISO(isoStr: string, jumlahHari: number): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + jumlahHari);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function PortalGuru({ namaGuru }: PortalGuruProps) {
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

  // State Form Laporan Terpadu
  const [formAnakId, setFormAnakId] = useState('');
  const [formTemaId, setFormTemaId] = useState('');
  const [formGuru, setFormGuru] = useState(namaGuru || 'Ibu Guru');
  const [formPeriodeMulai, setFormPeriodeMulai] = useState('');
  const [formPeriodeSelesai, setFormPeriodeSelesai] = useState('');
  const [formPeriode, setFormPeriode] = useState('');
  const [formSubtema, setFormSubtema] = useState('');
  const [formRekapHarian, setFormRekapHarian] = useState<SubtemaHarian[]>(DEFAULT_SUBTEMA_HARIAN);
  const [formAspekList, setFormAspekList] = useState<AspekPenilaian[]>(DEFAULT_ASPEK_LIST);
  const [formCatatanPerkembangan, setFormCatatanPerkembangan] = useState('');
  const [formRekomendasiRumah, setFormRekomendasiRumah] = useState('');
  const [fotoAktivitas, setFotoAktivitas] = useState<string | null>(null);

  const [editingLaporanId, setEditingLaporanId] = useState<string | null>(null);

  // State Form Tema
  const [formTema, setFormTema] = useState<{
    namaTema: string;
    mingguKe: string;
    periodeMulai: string;
    periodeSelesai: string;
    periode: string;
    subtemaHarian: SubtemaHarian[];
  }>({
    namaTema: '',
    mingguKe: '',
    periodeMulai: '',
    periodeSelesai: '',
    periode: '',
    subtemaHarian: DEFAULT_SUBTEMA_HARIAN,
  });
  const [editingTemaId, setEditingTemaId] = useState<string | null>(null);

  useEffect(() => {
    if (namaGuru) {
      setFormGuru(namaGuru);
    }
  }, [namaGuru]);

  const muat = async () => {
    setLoading(true);
    try {
      const [t, l, a] = await Promise.all([
        fetch('/api/tema-pembelajaran', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/laporan-mingguan', { cache: 'no-store' }).then((x) => x.json()),
        fetch('/api/arsip?status=AKTIF', { cache: 'no-store' }).then((x) => x.json()),
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

  const selectedSiswa = useMemo(() => {
    if (!formAnakId) return null;
    const found = siswa.find((s) => s.idAnak === formAnakId);
    if (found) return found;
    if (editingLaporanId) {
      const lap = laporan.find((l) => l.idLaporan === editingLaporanId);
      if (lap?.anak) return lap.anak as Anak;
    }
    return null;
  }, [formAnakId, siswa, editingLaporanId, laporan]);

  const selectedKelas = useMemo(() => {
    if (!selectedSiswa) return null;
    return kodeKelasAnak(selectedSiswa);
  }, [selectedSiswa]);

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

  // Handler saat memilih Tema Pembelajaran di form laporan
  const handlePilihTema = (id: string) => {
    setFormTemaId(id);
    if (!id) return;
    const t = tema.find((x) => x.idTema === id);
    if (t) {
      if (t.periode && !formPeriode) setFormPeriode(t.periode);
      const subList = parseSubtemaHarian(t.subtemaHarian);
      if (!editingLaporanId) {
        setFormRekapHarian(subList);
        setFormSubtema(subList[0]?.subtema || t.namaTema);
        // Jika item memiliki tanggal berformat YYYY-MM-DD, sinkronkan ke kalender
        if (subList[0]?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(subList[0].tanggal)) {
          setFormPeriodeMulai(subList[0].tanggal);
          if (subList[4]?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(subList[4].tanggal)) {
            setFormPeriodeSelesai(subList[4].tanggal);
          } else {
            setFormPeriodeSelesai(tambahHariISO(subList[0].tanggal, 4));
          }
        }
      }
    }
  };

  const handleGantiPeriodeLaporanMulai = (val: string) => {
    setFormPeriodeMulai(val);
    const selesaiOtomatis = val ? tambahHariISO(val, 4) : '';
    setFormPeriodeSelesai(selesaiOtomatis);
    const teks = formatRentangTanggal(val, selesaiOtomatis);
    setFormPeriode(teks);

    if (val) {
      const daftarHarian = [...formRekapHarian];
      for (let i = 0; i < 5; i++) {
        if (daftarHarian[i]) {
          daftarHarian[i].tanggal = tambahHariISO(val, i);
        }
      }
      setFormRekapHarian(daftarHarian);
    }
  };

  const handleGantiPeriodeLaporanSelesai = (val: string) => {
    setFormPeriodeSelesai(val);
    setFormPeriode(formatRentangTanggal(formPeriodeMulai, val));
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning('Ukuran foto aktivitas maksimal 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFotoAktivitas(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const simpanLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAnakId) {
      toast.warning('Silakan pilih nama anak terlebih dahulu.');
      return;
    }
    if (!formTemaId) {
      toast.warning('Silakan pilih tema pembelajaran.');
      return;
    }

    const payloadDetail: DetailLaporanMingguan = {
      versi: '2.0',
      guru: formGuru.trim() || 'Ibu Guru',
      periode: formPeriode.trim() || 'Minggu berjalan',
      subtema: formSubtema.trim() || 'Pembelajaran mingguan',
      rekapHarian: formRekapHarian,
      aspekPerkembangan: formAspekList,
      catatanPerkembangan: formCatatanPerkembangan.trim(),
      rekomendasiRumah: formRekomendasiRumah.trim(),
      fotoAktivitas: fotoAktivitas || null,
    };

    if (editingLaporanId) {
      const res = await fetch('/api/laporan-mingguan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLaporan: editingLaporanId,
          idTema: formTemaId,
          detailLaporan: payloadDetail,
        }),
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Laporan berhasil diperbarui.');
        batalEdit();
        muat();
      } else {
        toast.error(res.error || 'Gagal memperbarui laporan.');
      }
    } else {
      const res = await fetch('/api/laporan-mingguan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAnak: formAnakId,
          idTema: formTemaId,
          detailLaporan: payloadDetail,
        }),
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Laporan perkembangan mingguan berhasil disimpan.');
        batalEdit();
        muat();
      } else {
        toast.error(res.error || 'Gagal menyimpan laporan.');
      }
    }
  };

  const mulaiEditLaporan = (l: Laporan) => {
    setEditingLaporanId(l.idLaporan);
    setFormAnakId(l.anak.idAnak);
    setFormTemaId(l.tema?.idTema || '');

    const det = l.detailLaporan;
    if (det && det.aspekPerkembangan) {
      setFormGuru(det.guru || 'Ibu Guru');
      setFormPeriode(det.periode || '');
      setFormSubtema(det.subtema || '');
      setFormRekapHarian(det.rekapHarian || DEFAULT_SUBTEMA_HARIAN);
      setFormAspekList(det.aspekPerkembangan || DEFAULT_ASPEK_LIST);
      setFormCatatanPerkembangan(det.catatanPerkembangan || '');
      setFormRekomendasiRumah(det.rekomendasiRumah || '');
      setFotoAktivitas(det.fotoAktivitas || l.fotoAktivitas || null);
    } else {
      // Legacy fallback
      setFormGuru('Ibu Guru');
      setFormPeriode(l.tema?.periode || `Minggu ke-${l.tema?.mingguKe || 1}`);
      setFormSubtema(l.tema?.namaTema || '');
      setFormRekapHarian(parseSubtemaHarian(l.tema?.subtemaHarian));
      setFormAspekList(
        DEFAULT_ASPEK_LIST.map((asp) => ({
          ...asp,
          catatan: l.aspek === asp.aspek ? l.catatanKegiatan : '',
        }))
      );
      setFormCatatanPerkembangan(l.catatanKegiatan || '');
      setFormRekomendasiRumah('');
      setFotoAktivitas(l.fotoAktivitas || null);
    }

    setTab('laporan');
    setTimeout(() => {
      const el = document.getElementById('form-laporan-mingguan');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const batalEdit = () => {
    setEditingLaporanId(null);
    setFormAnakId('');
    setFormTemaId('');
    setFormGuru(namaGuru || 'Ibu Guru');
    setFormPeriodeMulai('');
    setFormPeriodeSelesai('');
    setFormPeriode('');
    setFormSubtema('');
    setFormRekapHarian(DEFAULT_SUBTEMA_HARIAN);
    setFormAspekList(DEFAULT_ASPEK_LIST);
    setFormCatatanPerkembangan('');
    setFormRekomendasiRumah('');
    setFotoAktivitas(null);
  };

  const hapusLaporan = async (idLaporan: string) => {
    if (!confirm('Hapus catatan laporan ini?')) return;
    const res = await fetch(`/api/laporan-mingguan?idLaporan=${idLaporan}`, { method: 'DELETE' }).then((x) => x.json());
    if (res.success) toast.info(res.message || 'Laporan dihapus.');
    else toast.error(res.error || 'Gagal menghapus laporan.');
    muat();
  };

  // Handler Tema Pembelajaran Kalender
  const handleGantiPeriodeTemaMulai = (val: string) => {
    const selesaiOtomatis = val ? tambahHariISO(val, 4) : '';
    const teks = formatRentangTanggal(val, selesaiOtomatis);
    const updatedHarian = formTema.subtemaHarian.map((item, idx) => ({
      ...item,
      tanggal: val ? tambahHariISO(val, idx) : item.tanggal,
    }));
    setFormTema((prev) => ({
      ...prev,
      periodeMulai: val,
      periodeSelesai: selesaiOtomatis,
      periode: teks,
      subtemaHarian: updatedHarian,
    }));
  };

  const handleGantiPeriodeTemaSelesai = (val: string) => {
    const teks = formatRentangTanggal(formTema.periodeMulai, val);
    setFormTema((prev) => ({
      ...prev,
      periodeSelesai: val,
      periode: teks,
    }));
  };

  const simpanTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTema.namaTema.trim() || !formTema.mingguKe) {
      toast.warning('Nama tema dan minggu ke- wajib diisi.');
      return;
    }
    const payload = {
      namaTema: formTema.namaTema.trim(),
      mingguKe: Number(formTema.mingguKe),
      periode: (formTema.periode || '').trim() || null,
      subtemaHarian: formTema.subtemaHarian,
    };

    try {
      if (editingTemaId) {
        const res = await fetch('/api/tema-pembelajaran', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idTema: editingTemaId, ...payload }),
        }).then((x) => x.json());
        if (res.success) {
          toast.success(res.message || 'Tema berhasil diperbarui.');
          batalEditTema();
          muat();
        } else {
          toast.error(res.error || 'Gagal memperbarui tema.');
        }
      } else {
        const res = await fetch('/api/tema-pembelajaran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((x) => x.json());
        if (res.success) {
          toast.success(res.message || 'Tema dan subtema harian berhasil disimpan.');
          batalEditTema();
          muat();
        } else {
          toast.error(res.error || 'Gagal menyimpan tema.');
        }
      }
    } catch {
      toast.error('Gagal menghubungi server. Silakan coba kembali.');
    }
  };

  const mulaiEditTema = (t: Tema) => {
    setEditingTemaId(t.idTema);
    const subHarian = parseSubtemaHarian(t.subtemaHarian);
    const tglAwal = subHarian[0]?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(subHarian[0].tanggal) ? subHarian[0].tanggal : '';
    const tglAkhir = subHarian[4]?.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(subHarian[4].tanggal)
      ? subHarian[4].tanggal
      : (tglAwal ? tambahHariISO(tglAwal, 4) : '');

    setFormTema({
      namaTema: t.namaTema,
      mingguKe: String(t.mingguKe),
      periodeMulai: tglAwal,
      periodeSelesai: tglAkhir,
      periode: t.periode || (tglAwal ? formatRentangTanggal(tglAwal, tglAkhir) : ''),
      subtemaHarian: subHarian,
    });
    const el = document.getElementById('form-tema-pembelajaran');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const batalEditTema = () => {
    setEditingTemaId(null);
    setFormTema({
      namaTema: '',
      mingguKe: '',
      periodeMulai: '',
      periodeSelesai: '',
      periode: '',
      subtemaHarian: DEFAULT_SUBTEMA_HARIAN,
    });
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
    batalEdit();
    setFormAnakId(anak.idAnak);
    setTab('laporan');
    setTimeout(() => {
      const el = document.getElementById('form-laporan-mingguan');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const TABS_GURU = [
    { id: 'laporan' as const, label: 'Laporan Mingguan', icon: FileText, count: laporan.length },
    { id: 'kelas' as const, label: 'Kelompok Kelas (KB, A, B)', icon: Users, count: siswa.length },
    { id: 'tema' as const, label: 'Tema & Subtema Harian', icon: BookOpen, count: tema.length },
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
              {/* FORMULIR LAPORAN PERKEMBANGAN 4 BAGIAN UTAMA */}
              <form
                id="form-laporan-mingguan"
                onSubmit={simpanLaporan}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-8"
              >
                {/* Header Form */}
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-[#095c51] mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{editingLaporanId ? 'Mode Edit Laporan' : 'Formulir Laporan Perkembangan'}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {editingLaporanId ? 'Perbarui Laporan Perkembangan Mingguan' : 'Input Laporan Perkembangan Mingguan'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lengkapi 4 komponen utama laporan (Informasi, Rekap Pembelajaran, Perkembangan Anak, Catatan &amp; Rekomendasi).
                    </p>
                  </div>
                  {editingLaporanId && (
                    <button
                      type="button"
                      onClick={batalEdit}
                      className="px-4 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs self-start sm:self-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batal Edit</span>
                    </button>
                  )}
                </div>

                {/* ========================================================
                    BAGIAN 1: INFORMASI LAPORAN
                ======================================================== */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#095c51] uppercase tracking-wider">
                    <Info className="w-4 h-4" />
                    <span>1. Informasi Laporan</span>
                  </div>

                  {/* Pemilihan Siswa Terpilih */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Nama Peserta Didik <span className="text-rose-500">*</span>
                    </label>

                    {formAnakId && selectedSiswa ? (
                      <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/70 border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-[#095c51] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                            <UserCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2.5 flex-wrap">
                              <span>{selectedSiswa.nama}</span>
                              {selectedKelas ? (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${BADGE_KELAS[selectedKelas]}`}>
                                  {LABEL_KELAS[selectedKelas]}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 font-medium">
                                  Belum Dikelompokkan
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Orang Tua: {selectedSiswa.keluarga?.namaAyah || selectedSiswa.keluarga?.namaIbu || '-'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormAnakId('')}
                          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#095c51] text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-center shrink-0 shadow-xs"
                        >
                          Ganti Siswa
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Kelompok:</span>
                          {([
                            { id: 'SEMUA' as FilterKelas, label: `Semua (${jumlahPerKelas.SEMUA})` },
                            { id: 'KB' as FilterKelas, label: `KB (${jumlahPerKelas.KB})` },
                            { id: 'A' as FilterKelas, label: `TK A (${jumlahPerKelas.A})` },
                            { id: 'B' as FilterKelas, label: `TK B (${jumlahPerKelas.B})` },
                          ]).map((k) => (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => setFilterKelasInput(k.id)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                filterKelasInput === k.id
                                  ? 'bg-[#095c51] text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {k.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={cariInput}
                              onChange={(e) => setCariInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (siswaTersaringInput.length > 0) {
                                    const target = siswaTersaringInput[0];
                                    setFormAnakId(target.idAnak);
                                    setCariInput('');
                                    toast.success(`Peserta didik terpilih: ${target.nama}`);
                                  } else {
                                    toast.warning('Peserta didik dengan nama tersebut tidak ditemukan.');
                                  }
                                }
                              }}
                              placeholder="Ketik nama anak lalu tekan Enter..."
                              className="w-full border border-slate-200 rounded-xl pl-10 pr-20 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 transition"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (siswaTersaringInput.length > 0) {
                                  const target = siswaTersaringInput[0];
                                  setFormAnakId(target.idAnak);
                                  setCariInput('');
                                  toast.success(`Peserta didik terpilih: ${target.nama}`);
                                } else {
                                  toast.warning('Peserta didik dengan nama tersebut tidak ditemukan.');
                                }
                              }}
                              disabled={siswaTersaringInput.length === 0}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#095c51] rounded-lg text-[10px] font-bold border border-teal-200 transition cursor-pointer disabled:opacity-40"
                              title="Tekan Enter atau klik untuk memilih"
                            >
                              Enter ↵
                            </button>

                            {/* Dropdown Hasil Pencarian Cepat */}
                            {cariInput.trim() && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                {siswaTersaringInput.length === 0 ? (
                                  <div className="p-3 text-xs text-slate-400 text-center">
                                    Tidak ada peserta didik yang cocok.
                                  </div>
                                ) : (
                                  siswaTersaringInput.map((s) => {
                                    const k = kodeKelasAnak(s);
                                    return (
                                      <button
                                        key={s.idAnak}
                                        type="button"
                                        onClick={() => {
                                          setFormAnakId(s.idAnak);
                                          setCariInput('');
                                          toast.success(`Peserta didik terpilih: ${s.nama}`);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-teal-50/70 flex items-center justify-between transition cursor-pointer"
                                      >
                                        <span className="font-bold text-slate-800">{s.nama}</span>
                                        <span className="text-[10px] text-slate-400">
                                          {k ? LABEL_KELAS[k] : 'Belum Ada Kelompok'}
                                        </span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                          <select
                            value={formAnakId}
                            onChange={(e) => {
                              if (e.target.value) setFormAnakId(e.target.value);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 transition"
                          >
                            <option value="">— Atau pilih dari daftar ({siswaTersaringInput.length}) —</option>
                            {siswaTersaringInput.map((s) => {
                              const k = kodeKelasAnak(s);
                              return (
                                <option key={s.idAnak} value={s.idAnak}>
                                  {s.nama} {k ? `(${LABEL_KELAS[k]})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grid Informasi Tema, Periode (Kalender), Guru (Otomatis) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tema Pembelajaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formTemaId}
                        onChange={(e) => handlePilihTema(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 transition"
                        required
                      >
                        <option value="">— Pilih Tema Pembelajaran —</option>
                        {tema.map((t) => (
                          <option key={t.idTema} value={t.idTema}>
                            Minggu ke-{t.mingguKe} : {t.namaTema}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#095c51]" />
                          <span>Periode Pelaksanaan (Kalender)</span>
                        </span>
                        {formPeriode ? (
                          <span className="text-[11px] font-bold text-[#095c51] truncate max-w-[200px]">
                            {formPeriode}
                          </span>
                        ) : null}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="date"
                            value={formPeriodeMulai}
                            onChange={(e) => handleGantiPeriodeLaporanMulai(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                          />
                          <span className="block text-[10px] text-slate-400 mt-0.5 pl-1">Mulai (Senin)</span>
                        </div>
                        <div>
                          <input
                            type="date"
                            value={formPeriodeSelesai}
                            onChange={(e) => handleGantiPeriodeLaporanSelesai(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                          />
                          <span className="block text-[10px] text-slate-400 mt-0.5 pl-1">Selesai (Jumat)</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>Guru Pendamping</span>
                        <span className="text-[10px] font-bold text-[#095c51] bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                          Akun Login
                        </span>
                      </label>
                      <div className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2.5 text-xs flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#095c51] shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{formGuru || namaGuru || 'Ibu Guru'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    BAGIAN 2: REKAP PEMBELAJARAN (SENIN - JUMAT)
                ======================================================== */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#095c51] uppercase tracking-wider">
                      <Calendar className="w-4 h-4" />
                      <span>2. Rekap Pembelajaran Harian (Senin – Jumat)</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Otomatis tersinkron dari tema atau dapat disesuaikan per anak
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold w-24">Hari</th>
                          <th className="px-3 py-2.5 text-left font-bold w-40">Keterangan Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-bold">Subtema / Materi Pembelajaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {formRekapHarian.map((item, idx) => (
                          <tr key={item.hari || idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-bold text-[#095c51]">{item.hari}</td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={item.tanggal || ''}
                                onChange={(e) => {
                                  const updated = [...formRekapHarian];
                                  updated[idx].tanggal = e.target.value;
                                  setFormRekapHarian(updated);
                                }}
                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-[#095c51]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.subtema}
                                onChange={(e) => {
                                  const updated = [...formRekapHarian];
                                  updated[idx].subtema = e.target.value;
                                  setFormRekapHarian(updated);
                                }}
                                placeholder={`Materi / Subtema ${item.hari}...`}
                                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-[#095c51]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ========================================================
                    BAGIAN 3: LAPORAN PERKEMBANGAN ANAK (5 ASPEK PAUD)
                ======================================================== */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#095c51] uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>3. Laporan Perkembangan Anak (5 Aspek Perkembangan)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span>Kategori Nilai:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">BB</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">MB</span>
                      <span className="px-2 py-0.5 rounded bg-teal-100 text-[#095c51] font-bold">BSH</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">BSB</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formAspekList.map((asp, idx) => (
                      <div
                        key={asp.aspek}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#095c51] text-white flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{asp.aspek}</span>
                          </div>

                          {/* Kategori Radio / Button Group */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-500 mr-1">Capaian:</span>
                            {(['BB', 'MB', 'BSH', 'BSB'] as NilaiKategori[]).map((kat) => (
                              <button
                                key={kat}
                                type="button"
                                onClick={() => {
                                  const updated = [...formAspekList];
                                  updated[idx].hasil = kat;
                                  setFormAspekList(updated);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  asp.hasil === kat
                                    ? KETERANGAN_KATEGORI[kat].badge + ' ring-2 ring-[#095c51]/30 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                }`}
                                title={KETERANGAN_KATEGORI[kat].desc}
                              >
                                {kat} &bull; {KETERANGAN_KATEGORI[kat].desc}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Indikator Capaian Pembelajaran
                            </label>
                            <input
                              type="text"
                              value={asp.indikator}
                              onChange={(e) => {
                                const updated = [...formAspekList];
                                updated[idx].indikator = e.target.value;
                                setFormAspekList(updated);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                              placeholder="Indikator..."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Catatan Pengamatan Guru
                            </label>
                            <textarea
                              rows={2}
                              value={asp.catatan}
                              onChange={(e) => {
                                const updated = [...formAspekList];
                                updated[idx].catatan = e.target.value;
                                setFormAspekList(updated);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51] resize-none"
                              placeholder="Deskripsi hasil perkembangan anak pada aspek ini..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ========================================================
                    BAGIAN 4: CATATAN GURU & REKOMENDASI UNTUK ORANG TUA
                ======================================================== */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#095c51] uppercase tracking-wider">
                    <HeartHandshake className="w-4 h-4" />
                    <span>4. Catatan Guru &amp; Rekomendasi untuk Orang Tua</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#095c51]" />
                        <span>Catatan Perkembangan Minggu Ini</span>
                      </label>
                      <textarea
                        rows={4}
                        value={formCatatanPerkembangan}
                        onChange={(e) => setFormCatatanPerkembangan(e.target.value)}
                        placeholder="Catatan capaian dan evaluasi perkembangan belajar anak minggu ini..."
                        className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                        <span>Rekomendasi Aktivitas di Rumah</span>
                      </label>
                      <textarea
                        rows={4}
                        value={formRekomendasiRumah}
                        onChange={(e) => setFormRekomendasiRumah(e.target.value)}
                        placeholder="Rekomendasi kegiatan stimulasi dan pendampingan di rumah..."
                        className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 resize-none"
                      />
                    </div>
                  </div>

                  {/* Upload Foto Aktivitas */}
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col sm:flex-row items-center gap-4">
                    {fotoAktivitas ? (
                      <div className="relative group shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fotoAktivitas}
                          alt="Foto Aktivitas"
                          className="w-24 h-24 object-cover rounded-2xl border border-slate-200 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setFotoAktivitas(null)}
                          className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full text-xs shadow-md transition cursor-pointer"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex flex-col items-center justify-center shrink-0">
                        <ImageIcon className="w-7 h-7" />
                        <span className="text-[10px] mt-1">Belum ada</span>
                      </div>
                    )}
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <div className="text-xs font-semibold text-slate-700">
                        {fotoAktivitas ? 'Foto aktivitas terpilih' : 'Unggah foto dokumentasi kegiatan siswa'}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Foto aktivitas anak akan langsung tampil di kartu laporan dan dashboard portal orang tua.
                      </p>
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#095c51] text-slate-700 text-xs font-bold transition cursor-pointer shadow-xs">
                        <Camera className="w-3.5 h-3.5 text-[#095c51]" />
                        <span>{fotoAktivitas ? 'Ganti Foto' : 'Pilih Foto Aktivitas'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Tombol Simpan Laporan */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  {editingLaporanId && (
                    <button
                      type="button"
                      onClick={batalEdit}
                      className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-2xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-md flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingLaporanId ? 'Simpan Perubahan Laporan' : 'Simpan Laporan Perkembangan Mingguan'}</span>
                  </button>
                </div>
              </form>

              {/* RIWAYAT LAPORAN TERSIMPAN */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Riwayat Laporan Perkembangan Tersimpan</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {laporanTersaring.length} laporan ditampilkan &bull; Klik Edit untuk memperbarui atau melengkapi data.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      {(['SEMUA', 'KB', 'A', 'B'] as FilterKelas[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFilterKelasLaporan(k)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            filterKelasLaporan === k
                              ? 'bg-[#095c51] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {k === 'SEMUA' ? 'Semua' : k === 'KB' ? 'KB' : `TK ${k}`}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cariLaporan}
                        onChange={(e) => setCariLaporan(e.target.value)}
                        placeholder="Cari nama anak..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                      />
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="p-8 text-xs text-slate-500 text-center">Memuat riwayat laporan…</div>
                ) : laporanTersaring.length === 0 ? (
                  <div className="p-8 text-xs text-slate-400 text-center">
                    Belum ada laporan perkembangan pada filter ini.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {laporanTersaring.map((l) => {
                      const k = kodeKelasAnak(l.anak || {});
                      const isBeingEdited = editingLaporanId === l.idLaporan;
                      const det = l.detailLaporan;

                      return (
                        <div
                          key={l.idLaporan}
                          className={`p-6 transition ${isBeingEdited ? 'bg-amber-50/50 border-l-4 border-amber-500' : 'hover:bg-slate-50/40'}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              {/* Header Item */}
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-sm font-bold text-slate-900">{l.anak?.nama}</span>
                                {k && (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${BADGE_KELAS[k]}`}>
                                    {LABEL_KELAS[k]}
                                  </span>
                                )}
                                <span className="text-slate-400">&bull;</span>
                                <span className="text-xs font-semibold text-[#095c51]">
                                  Minggu ke-{l.tema?.mingguKe} &bull; Tema: {l.tema?.namaTema}
                                </span>
                                {det?.periode && (
                                  <span className="text-xs text-slate-500">({det.periode})</span>
                                )}
                              </div>

                              {/* Aspek Perkembangan Badges */}
                              {det?.aspekPerkembangan && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {det.aspekPerkembangan.map((asp) => (
                                    <div
                                      key={asp.aspek}
                                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center gap-1.5"
                                    >
                                      <span className="font-semibold text-slate-700">{asp.aspek}:</span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${KETERANGAN_KATEGORI[asp.hasil]?.badge || 'bg-slate-200'}`}
                                      >
                                        {asp.hasil}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Catatan Naratif */}
                              <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                                {det?.subtema && (
                                  <div className="text-[11px] text-[#095c51] font-bold">
                                    Subtema: {det.subtema}
                                  </div>
                                )}
                                <div>{det?.catatanPerkembangan || l.catatanKegiatan}</div>
                                {det?.rekomendasiRumah && (
                                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                                    <strong>Rekomendasi di Rumah:</strong> {det.rekomendasiRumah}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Foto & Aksi */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                              {l.fotoAktivitas && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={l.fotoAktivitas}
                                  alt="Foto Aktivitas"
                                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition"
                                  onClick={() => window.open(l.fotoAktivitas || '', '_blank')}
                                  title="Klik untuk memperbesar"
                                />
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => mulaiEditLaporan(l)}
                                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => hapusLaporan(l.idLaporan)}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TEMA PEMBELAJARAN & SUBTEMA HARIAN */}
          {tab === 'tema' && (
            <div className="space-y-6">
              <form
                id="form-tema-pembelajaran"
                onSubmit={simpanTema}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#095c51]" />
                      <span>{editingTemaId ? 'Edit Tema Pembelajaran' : 'Tambah Tema Mingguan Baru'}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tentukan nama tema, periode tanggal, dan rincian subtema harian beserta kegiatan dari Senin sampai Jumat.
                    </p>
                  </div>
                  {editingTemaId && (
                    <button
                      type="button"
                      onClick={batalEditTema}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                {/* Input Utama Tema */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Minggu Ke- <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={formTema.mingguKe}
                      onChange={(e) => setFormTema({ ...formTema, mingguKe: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                      placeholder="1, 2, ..."
                      required
                    />
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Tema Utama <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={formTema.namaTema}
                      onChange={(e) => setFormTema({ ...formTema, namaTema: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                      placeholder="Nama tema utama..."
                      required
                    />
                  </div>

                  <div className="lg:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#095c51]" />
                        <span>Periode Tanggal Pelaksanaan</span>
                      </span>
                      {formTema.periode ? (
                        <span className="text-[11px] font-bold text-[#095c51] truncate">
                          {formTema.periode}
                        </span>
                      ) : null}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="date"
                          value={formTema.periodeMulai}
                          onChange={(e) => handleGantiPeriodeTemaMulai(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-[#095c51]"
                        />
                        <span className="block text-[10px] text-slate-400 mt-0.5 pl-1">Mulai (Senin)</span>
                      </div>
                      <div>
                        <input
                          type="date"
                          value={formTema.periodeSelesai}
                          onChange={(e) => handleGantiPeriodeTemaSelesai(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-[#095c51]"
                        />
                        <span className="block text-[10px] text-slate-400 mt-0.5 pl-1">Selesai (Jumat)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABEL SUBTEMA HARIAN (SENIN - JUMAT) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#095c51] uppercase tracking-wider">
                      Rencana Subtema Harian (Senin – Jumat)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Rincian subtema harian per tanggal untuk minggu ini
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold w-24">Hari</th>
                          <th className="px-3 py-2.5 text-left font-bold w-40">Keterangan Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-bold">Subtema Harian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {formTema.subtemaHarian.map((item, idx) => (
                          <tr key={item.hari || idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-bold text-[#095c51]">{item.hari}</td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={item.tanggal || ''}
                                onChange={(e) => {
                                  const updated = [...formTema.subtemaHarian];
                                  updated[idx].tanggal = e.target.value;
                                  setFormTema({ ...formTema, subtemaHarian: updated });
                                }}
                                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-[#095c51]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.subtema}
                                onChange={(e) => {
                                  const updated = [...formTema.subtemaHarian];
                                  updated[idx].subtema = e.target.value;
                                  setFormTema({ ...formTema, subtemaHarian: updated });
                                }}
                                placeholder={`Subtema ${item.hari}...`}
                                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-[#095c51]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingTemaId ? 'Simpan Perubahan Tema' : 'Simpan Tema Pembelajaran'}</span>
                  </button>
                  {editingTemaId && (
                    <button
                      type="button"
                      onClick={batalEditTema}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>

              {/* DAFTAR TEMA PEMBELAJARAN TERSIMPAN */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Daftar Agenda Tema &amp; Subtema</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{tema.length} tema aktif terdaftar.</p>
                  </div>
                </div>

                {tema.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Belum ada tema yang ditambahkan.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tema.map((t) => {
                      const subList = parseSubtemaHarian(t.subtemaHarian);
                      const isEditing = editingTemaId === t.idTema;

                      return (
                        <div
                          key={t.idTema}
                          className={`p-6 transition ${isEditing ? 'bg-amber-50/50 border-l-4 border-amber-500' : 'hover:bg-slate-50/40'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-[#095c51] font-bold text-xs">
                                  Minggu ke-{t.mingguKe}
                                </span>
                                <h3 className="text-base font-bold text-slate-900">{t.namaTema}</h3>
                                {t.periode && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                    Periode: {t.periode}
                                  </span>
                                )}
                              </div>

                              {/* Tabel Mini Subtema Harian */}
                              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 max-w-2xl">
                                <table className="w-full text-[11px]">
                                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                      <th className="px-3 py-1.5 text-left font-bold w-20">Hari</th>
                                      <th className="px-3 py-1.5 text-left font-bold w-32">Tanggal</th>
                                      <th className="px-3 py-1.5 text-left font-bold">Subtema</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {subList.map((sh, sIdx) => (
                                      <tr key={sIdx} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-1.5 font-bold text-[#095c51]">{sh.hari}</td>
                                        <td className="px-3 py-1.5 text-slate-500">{sh.tanggal || '—'}</td>
                                        <td className="px-3 py-1.5 font-medium text-slate-800">{sh.subtema || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-start shrink-0">
                              <button
                                type="button"
                                onClick={() => mulaiEditTema(t)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition"
                                title="Edit tema & subtema ini"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => hapusTema(t.idTema)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition"
                                title="Hapus tema ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
