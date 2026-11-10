'use client';

import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Power,
  X,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

type PeranStafKelola = 'GURU' | 'BENDAHARA' | 'KEPALA_SEKOLAH';

type AkunStafItem = {
  idAkun: string;
  nama: string;
  email: string;
  peran: PeranStafKelola;
  aktif: boolean;
  createdAt: string;
};

type RingkasanPeran = {
  peran: PeranStafKelola;
  total: number;
  aktif: number;
  sudahAda: boolean;
};

const LABEL_PERAN: Record<PeranStafKelola, string> = {
  GURU: 'Guru Kelas',
  BENDAHARA: 'Bendahara Sekolah',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
};

const WARNA_PERAN: Record<PeranStafKelola, string> = {
  GURU: 'bg-emerald-100 text-emerald-800',
  BENDAHARA: 'bg-amber-100 text-amber-800',
  KEPALA_SEKOLAH: 'bg-indigo-100 text-indigo-800',
};

export default function PortalSuperAdmin() {
  const { toast } = useToast();
  const [daftar, setDaftar] = useState<AkunStafItem[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanPeran[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form buat akun staf baru
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [peran, setPeran] = useState<PeranStafKelola>('GURU');
  const [kataSandi, setKataSandi] = useState('');
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('');
  const [showSandi, setShowSandi] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);

  // Modal reset sandi staf
  const [resetTarget, setResetTarget] = useState<AkunStafItem | null>(null);
  const [resetSandiBaru, setResetSandiBaru] = useState('');
  const [showResetSandi, setShowResetSandi] = useState(false);

  const muat = async () => {
    try {
      const res = await fetch('/api/staf').then((r) => r.json());
      if (res.success) {
        setDaftar(res.data || []);
        setRingkasan(res.ringkasanPeran || []);
      } else {
        toast.error(res.error || 'Gagal memuat daftar akun staf.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // setState terjadi setelah await di dalam muat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buatAkun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim() || !kataSandi) {
      toast.warning('Nama lengkap, email, peran, dan kata sandi wajib diisi.');
      return;
    }
    if (kataSandi.length < 6) {
      toast.warning('Kata sandi minimal 6 karakter.');
      return;
    }
    if (kataSandi !== konfirmasiSandi) {
      toast.error('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          email: email.trim(),
          peran,
          kataSandi,
        }),
      }).then((r) => r.json());

      if (res.success) {
        toast.success(res.message || 'Akun staf berhasil dibuat.');
        setNama('');
        setEmail('');
        setKataSandi('');
        setKonfirmasiSandi('');
        muat();
      } else {
        toast.error(res.error || 'Gagal membuat akun staf.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan akun staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAktif = async (akun: AkunStafItem) => {
    try {
      const res = await fetch('/api/staf', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAkun: akun.idAkun, aktif: !akun.aktif }),
      }).then((r) => r.json());
      if (res.success) {
        toast.success(`Akun ${akun.nama} ${!akun.aktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
        muat();
      } else {
        toast.error(res.error || 'Gagal mengubah status akun.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    }
  };

  const simpanResetSandi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetSandiBaru.length < 6) {
      toast.warning('Kata sandi baru minimal 6 karakter.');
      return;
    }

    try {
      const res = await fetch('/api/staf', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAkun: resetTarget.idAkun, kataSandiBaru: resetSandiBaru }),
      }).then((r) => r.json());
      if (res.success) {
        toast.success(`Kata sandi ${resetTarget.nama} berhasil diperbarui.`);
        setResetTarget(null);
        setResetSandiBaru('');
      } else {
        toast.error(res.error || 'Gagal memperbarui kata sandi.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    }
  };

  const hapusAkun = async (akun: AkunStafItem) => {
    if (!confirm(`Hapus akun ${akun.nama} (${LABEL_PERAN[akun.peran]})?`)) return;
    try {
      const res = await fetch(`/api/staf?idAkun=${encodeURIComponent(akun.idAkun)}`, {
        method: 'DELETE',
      }).then((r) => r.json());
      if (res.success) {
        toast.info(res.message || 'Akun staf dihapus.');
        muat();
      } else {
        toast.error(res.error || 'Gagal menghapus akun staf.');
      }
    } catch {
      toast.error('Gagal terhubung ke server.');
    }
  };

  const pilihPeranCepat = (targetPeran: PeranStafKelola) => {
    setPeran(targetPeran);
    const placeholderEmail =
      targetPeran === 'GURU'
        ? 'guru@siaptk.sch.id'
        : targetPeran === 'BENDAHARA'
          ? 'bendahara@siaptk.sch.id'
          : 'kepsek@siaptk.sch.id';
    if (!email) setEmail(placeholderEmail);
    document.getElementById('form-buat-staf')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#095c51] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portal Super Admin</h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola dan buat akun staf sekolah (Guru Kelas, Bendahara Sekolah, dan Kepala Sekolah) agar dapat masuk ke portal masing-masing.
            </p>
          </div>
        </div>
        <div className="text-xs px-4 py-2 rounded-xl bg-teal-50 text-[#095c51] font-bold shrink-0">
          Total Staf Terdaftar: {daftar.length}
        </div>
      </div>

      {/* Status Kelengkapan Akun Staf per Peran */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['GURU', 'BENDAHARA', 'KEPALA_SEKOLAH'] as PeranStafKelola[]).map((p) => {
          const info = ringkasan.find((r) => r.peran === p);
          const sudahAda = info?.sudahAda ?? false;
          return (
            <div
              key={p}
              className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between gap-4 ${
                sudahAda ? 'bg-white border-slate-200' : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${WARNA_PERAN[p]}`}>
                    {LABEL_PERAN[p]}
                  </span>
                  <div className="mt-3 text-lg font-bold text-slate-900">
                    {sudahAda ? `${info?.aktif} Akun Aktif` : 'Belum Ada Akun'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sudahAda
                      ? `Total ${info?.total} akun terdaftar untuk peran ini.`
                      : `Akun ${LABEL_PERAN[p]} belum dibuat. Buat sekarang agar staf dapat login.`}
                  </p>
                </div>
                {sudahAda ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                )}
              </div>

              <button
                type="button"
                onClick={() => pilihPeranCepat(p)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  sudahAda
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-[#095c51] hover:bg-[#074840] text-white shadow-sm'
                }`}
              >
                {sudahAda ? `+ Tambah ${LABEL_PERAN[p]}` : `Buat Akun ${LABEL_PERAN[p]}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Form Buat Akun Staf Baru */}
      <form
        id="form-buat-staf"
        onSubmit={buatAkun}
        className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 space-y-6"
      >
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#095c51] flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Buat Akun Staf Sekolah Baru</h2>
            <p className="text-xs text-slate-500">
              Daftarkan akun untuk Guru Kelas, Kepala Sekolah, atau Bendahara Sekolah.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap Staf <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Siti Aminah, S.Pd."
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Peran / Jabatan <span className="text-rose-500">*</span>
            </label>
            <select
              value={peran}
              onChange={(e) => setPeran(e.target.value as PeranStafKelola)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-white cursor-pointer"
            >
              <option value="GURU">Guru Kelas</option>
              <option value="BENDAHARA">Bendahara Sekolah</option>
              <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Login <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@siaptk.sch.id"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSandi ? 'text' : 'password'}
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  placeholder="Min. 6 karakter"
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowSandi(!showSandi)}
                  aria-label={showSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                >
                  {showSandi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Konfirmasi Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKonfirmasi ? 'text' : 'password'}
                  value={konfirmasiSandi}
                  onChange={(e) => setKonfirmasiSandi(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowKonfirmasi(!showKonfirmasi)}
                  aria-label={showKonfirmasi ? 'Sembunyikan konfirmasi sandi' : 'Tampilkan konfirmasi sandi'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                >
                  {showKonfirmasi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Membuat Akun...' : 'Buat Akun Staf'}</span>
          </button>
        </div>
      </form>

      {/* Daftar Akun Staf */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-[#095c51]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Akun Staf Sekolah</h2>
              <p className="text-xs text-slate-500">Kelola akses masuk guru, bendahara, dan kepala sekolah.</p>
            </div>
          </div>
          <button onClick={muat} className="text-xs font-bold text-[#095c51] hover:underline cursor-pointer">
            Muat Ulang
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Memuat daftar akun staf...</div>
        ) : daftar.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada akun staf sekolah yang dibuat. Gunakan form di atas untuk membuat akun Guru, Bendahara, dan Kepala Sekolah.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">NAMA LENGKAP</th>
                  <th className="px-4 py-3.5 font-semibold">EMAIL</th>
                  <th className="px-4 py-3.5 font-semibold">PERAN</th>
                  <th className="px-4 py-3.5 font-semibold">STATUS</th>
                  <th className="px-6 py-3.5 font-semibold text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((akun) => (
                  <tr key={akun.idAkun} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{akun.nama}</td>
                    <td className="px-4 py-4 text-slate-600">{akun.email}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${WARNA_PERAN[akun.peran]}`}>
                        {LABEL_PERAN[akun.peran]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          akun.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {akun.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(akun);
                            setResetSandiBaru('');
                            setShowResetSandi(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 text-[#095c51] font-bold cursor-pointer inline-flex items-center gap-1 hover:bg-teal-100"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Sandi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAktif(akun)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer inline-flex items-center gap-1 hover:bg-slate-200"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{akun.aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => hapusAkun(akun)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer inline-flex items-center gap-1 hover:bg-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Reset Kata Sandi Staf */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={simpanResetSandi}
            className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl border border-slate-100 space-y-5"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Kata Sandi Staf</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {resetTarget.nama} ({LABEL_PERAN[resetTarget.peran]})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Baru</label>
              <div className="relative">
                <input
                  type={showResetSandi ? 'text' : 'password'}
                  value={resetSandiBaru}
                  onChange={(e) => setResetSandiBaru(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowResetSandi(!showResetSandi)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#095c51] cursor-pointer"
                >
                  {showResetSandi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer"
              >
                Simpan Kata Sandi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

