'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Database,
  Search,
  CheckCircle2,
  RefreshCw,
  Calendar,
  X,
  Filter,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

type Alumni = {
  idAlumni: string;
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: string;
  namaAyah?: string | null;
  namaIbu?: string | null;
  noHp?: string | null;
  alamat?: string | null;
  tahunLulus: string;
  kelompokTerakhir: string;
  tglLulus: string;
  catatan?: string | null;
};

type SiswaAktif = {
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: string;
  keluarga?: { namaAyah?: string | null; namaIbu?: string | null; noHp?: string | null };
  riwayatKelompok?: { kelompok?: { nama: string } }[];
};

export default function PanelAlumni() {
  const { toast } = useToast();
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [siswaAktif, setSiswaAktif] = useState<SiswaAktif[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState('alumni_siaptk');

  const [subTab, setSubTab] = useState<'daftar_alumni' | 'luluskan_siswa'>('daftar_alumni');
  const [cariAlumni, setCariAlumni] = useState('');
  const [filterTahun, setFilterTahun] = useState('SEMUA');

  const [cariSiswa, setCariSiswa] = useState('');
  const [filterKelompokSiswa, setFilterKelompokSiswa] = useState('SEMUA');

  // Modal kelulusan
  const [modalSiswa, setModalSiswa] = useState<SiswaAktif | null>(null);
  const [formTahunLulus, setFormTahunLulus] = useState('2025/2026');
  const [formCatatan, setFormCatatan] = useState('Lulus dengan predikat sangat baik dan siap melanjutkan ke jenjang Sekolah Dasar (SD).');
  const [submitting, setSubmitting] = useState(false);

  const muatData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alumni', { cache: 'no-store' }).then((x) => x.json());
      if (res.success) {
        setAlumni(res.data || []);
        setSiswaAktif(res.siswaAktif || []);
        if (res.database) setDbName(res.database);
      } else {
        toast.error(res.error || 'Gagal memuat data alumni.');
      }
    } catch {
      toast.error('Gagal terhubung ke database alumni.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tahunList = useMemo(() => {
    const setTahun = new Set<string>();
    alumni.forEach((a) => {
      if (a.tahunLulus) setTahun.add(a.tahunLulus);
    });
    return Array.from(setTahun);
  }, [alumni]);

  const alumniTersaring = useMemo(() => {
    const q = cariAlumni.trim().toLowerCase();
    return alumni.filter((a) => {
      if (filterTahun !== 'SEMUA' && a.tahunLulus !== filterTahun) return false;
      if (q && !a.nama.toLowerCase().includes(q) && !a.nik.includes(q)) return false;
      return true;
    });
  }, [alumni, cariAlumni, filterTahun]);

  const siswaTersaring = useMemo(() => {
    const q = cariSiswa.trim().toLowerCase();
    return siswaAktif.filter((s) => {
      const klp = s.riwayatKelompok?.[0]?.kelompok?.nama || '';
      if (filterKelompokSiswa !== 'SEMUA') {
        if (filterKelompokSiswa === 'TK B' && !klp.includes('B')) return false;
        if (filterKelompokSiswa === 'TK A' && !klp.includes('A')) return false;
        if (filterKelompokSiswa === 'KB' && !klp.includes('KB')) return false;
      }
      if (q && !s.nama.toLowerCase().includes(q) && !s.nik.includes(q)) return false;
      return true;
    });
  }, [siswaAktif, cariSiswa, filterKelompokSiswa]);

  const handleLuluskan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSiswa) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAnak: modalSiswa.idAnak,
          tahunLulus: formTahunLulus,
          catatan: formCatatan,
        }),
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Siswa berhasil dipindahkan ke Database Alumni!');
        setModalSiswa(null);
        muatData();
      } else {
        toast.error(res.error || 'Gagal meluluskan siswa.');
      }
    } catch {
      toast.error('Kesalahan koneksi saat menyimpan ke Database Alumni.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Status Banner */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-teal-500/10 border border-[#095c51]/20 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#095c51] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Target Database Penyimpanan:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#095c51] text-white">
                {dbName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data kelulusan siswa disimpan di database sekunder <code>{dbName}</code> dan diarsip secara independen dari database operasional.
            </p>
          </div>
        </div>
        <button
          onClick={muatData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#095c51] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-center shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab('daftar_alumni')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            subTab === 'daftar_alumni'
              ? 'bg-[#095c51] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Daftar Siswa Lulus ({alumni.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('luluskan_siswa')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            subTab === 'luluskan_siswa'
              ? 'bg-[#095c51] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Proses Kelulusan Siswa ({siswaAktif.length} Siswa Aktif)</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR ALUMNI DARI DATABASE 2 */}
      {subTab === 'daftar_alumni' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Data Alumni Tersimpan di Database:</span>
                <span className="font-mono text-[#095c51] bg-teal-50 px-2 py-0.5 rounded-md text-xs">
                  {dbName}.alumni
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {alumniTersaring.length} dari {alumni.length} siswa lulus terdata.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tahunList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterTahun}
                    onChange={(e) => setFilterTahun(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700"
                  >
                    <option value="SEMUA">Semua Tahun Lulus</option>
                    {tahunList.map((t) => (
                      <option key={t} value={t}>
                        Tahun {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cariAlumni}
                  onChange={(e) => setCariAlumni(e.target.value)}
                  placeholder="Cari nama atau NIK..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#095c51]/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500">Memuat data dari database alumni…</div>
          ) : alumniTersaring.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-600">Belum ada siswa yang lulus.</div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Buka tab &quot;Proses Kelulusan Siswa&quot; untuk meluluskan siswa aktif dan menyimpannya secara otomatis ke database <code>{dbName}</code>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="text-left px-6 py-3.5">Nama Alumni</th>
                    <th className="text-left px-4 py-3.5">NIK</th>
                    <th className="text-left px-4 py-3.5">Kelompok Terakhir</th>
                    <th className="text-left px-4 py-3.5">Tahun Lulus</th>
                    <th className="text-left px-4 py-3.5">Tanggal Lulus</th>
                    <th className="text-left px-4 py-3.5">Orang Tua / Kontak</th>
                    <th className="text-left px-6 py-3.5">Catatan Kelulusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumniTersaring.map((a) => (
                    <tr key={a.idAlumni} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900">{a.nama}</div>
                        <div className="text-[10px] text-slate-400">JK: {a.jenisKelamin}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">{a.nik}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {a.kelompokTerakhir}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{a.tahunLulus}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">{a.tglLulus}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div>{a.namaAyah || a.namaIbu || '-'}</div>
                        {a.noHp && <div className="text-[10px] text-slate-400 font-mono">{a.noHp}</div>}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-xs">{a.catatan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROSES KELULUSAN SISWA */}
      {subTab === 'luluskan_siswa' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Siswa Aktif Siap Lulus</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih siswa yang telah menyelesaikan masa studi untuk diluluskan dan dipindahkan ke Database 2 (<code>{dbName}</code>).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['SEMUA', 'TK B', 'TK A', 'KB'] as const).map((klp) => (
                <button
                  key={klp}
                  type="button"
                  onClick={() => setFilterKelompokSiswa(klp)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition ${
                    filterKelompokSiswa === klp
                      ? 'bg-[#095c51] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {klp === 'SEMUA' ? 'Semua' : klp}
                </button>
              ))}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cariSiswa}
                  onChange={(e) => setCariSiswa(e.target.value)}
                  placeholder="Cari siswa aktif..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#095c51]/30 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {siswaTersaring.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada siswa aktif pada filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="text-left px-6 py-3.5">Nama Siswa</th>
                    <th className="text-left px-4 py-3.5">NIK</th>
                    <th className="text-left px-4 py-3.5">Kelompok Saat Ini</th>
                    <th className="text-left px-4 py-3.5">Orang Tua</th>
                    <th className="text-right px-6 py-3.5">Aksi Kelulusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siswaTersaring.map((s) => {
                    const klp = s.riwayatKelompok?.[0]?.kelompok?.nama || 'TK B';
                    return (
                      <tr key={s.idAnak} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{s.nama}</td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">{s.nik}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-[#095c51]">
                            {klp}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {s.keluarga?.namaAyah || s.keluarga?.namaIbu || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setModalSiswa(s);
                              setFormTahunLulus('2025/2026');
                              setFormCatatan(
                                `Siswa ${s.nama} dinyatakan lulus resmi dari kelompok ${klp} dan siap melanjutkan ke jenjang Sekolah Dasar (SD).`
                              );
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Luluskan ke DB 2</span>
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
      )}

      {/* MODAL KONFIRMASI KELULUSAN */}
      {modalSiswa && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleLuluskan}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#095c51]">
                <GraduationCap className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Tetapkan Kelulusan Siswa</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalSiswa(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 text-xs space-y-1">
              <div className="font-bold text-slate-900">{modalSiswa.nama}</div>
              <div className="text-slate-600 font-mono text-[11px]">NIK: {modalSiswa.nik}</div>
              <div className="text-[#095c51] font-semibold text-[11px]">
                Target Database Penyimpanan: <code>{dbName}.alumni</code>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tahun Kelulusan *</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  value={formTahunLulus}
                  onChange={(e) => setFormTahunLulus(e.target.value)}
                  placeholder="Contoh: 2025/2026"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-[#095c51]/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Catatan Kelulusan</label>
              <textarea
                rows={3}
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#095c51]/30 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalSiswa(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Menyimpan ke DB 2…' : 'Simpan ke Database Alumni'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

