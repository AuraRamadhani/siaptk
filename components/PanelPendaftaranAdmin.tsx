'use client';

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Plus, Trash2, Upload, CheckCircle2 } from 'lucide-react';
import { cekKelayakanTanggalLahir } from '@/lib/usia';
import { useToast } from '@/components/Toast';

type AnakForm = {
  nama: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: string;
  fileAkta: File | null;
  fileFoto: File | null;
  fileKia: File | null;
};

const kosong: AnakForm = {
  nama: '',
  nik: '',
  tglLahir: '',
  jenisKelamin: 'L',
  fileAkta: null,
  fileFoto: null,
  fileKia: null,
};

export default function PanelPendaftaranAdmin({ onSukses }: { onSukses?: () => void }) {
  const { toast } = useToast();
  const [keluarga, setKeluarga] = useState({
    namaAyah: '',
    namaIbu: '',
    noHp: '',
    email: '',
  });
  const [anak, setAnak] = useState<AnakForm[]>([{ ...kosong }]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);

  const ubahAnak = (i: number, patch: Partial<AnakForm>) => {
    setAnak((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keluarga.noHp.trim()) {
      toast.warning('Nomor HP orang tua / wali wajib diisi.');
      return;
    }

    for (let i = 0; i < anak.length; i++) {
      const a = anak[i];
      if (!a.nama.trim() || !a.nik.trim() || !a.tglLahir) {
        toast.warning(`Data anak ke-${i + 1} belum lengkap (Nama, NIK, dan Tgl Lahir wajib diisi).`);
        return;
      }
      if (!/^\d{16}$/.test(a.nik)) {
        toast.warning(`NIK anak ke-${i + 1} harus tepat 16 digit angka.`);
        return;
      }
      const kelayakan = cekKelayakanTanggalLahir(a.tglLahir);
      if (!kelayakan.valid) {
        toast.warning(`Anak ke-${i + 1}: ${kelayakan.pesan}`);
        return;
      }
    }

    setLoading(true);
    setPesan('');

    try {
      const fd = new FormData();
      fd.append('namaAyah', keluarga.namaAyah.trim());
      fd.append('namaIbu', keluarga.namaIbu.trim());
      fd.append('noHp', keluarga.noHp.trim());
      fd.append('email', keluarga.email.trim());
      fd.append('anakCount', String(anak.length));

      anak.forEach((a, idx) => {
        fd.append(`nama_${idx}`, a.nama.trim());
        fd.append(`nik_${idx}`, a.nik.trim());
        fd.append(`tglLahir_${idx}`, a.tglLahir);
        fd.append(`jenisKelamin_${idx}`, a.jenisKelamin);
        if (a.fileAkta) fd.append(`akta_${idx}`, a.fileAkta);
        if (a.fileFoto) fd.append(`foto_${idx}`, a.fileFoto);
        if (a.fileKia) fd.append(`kia_${idx}`, a.fileKia);
      });

      const res = await fetch('/api/pendaftaran/admin', {
        method: 'POST',
        body: fd,
      }).then((x) => x.json());

      if (res.success) {
        toast.success(res.message || 'Pendaftaran onsite berhasil disimpan.');
        setPesan(res.message);
        setKeluarga({ namaAyah: '', namaIbu: '', noHp: '', email: '' });
        setAnak([{ ...kosong }]);
        onSukses?.();
      } else {
        toast.error(res.error || 'Gagal menyimpan pendaftaran.');
        setPesan(res.error);
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengirim data ke server.');
      setPesan('Terjadi kesalahan saat mengirim data ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={kirim} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-900">Formulir Pendaftaran Siswa Baru (Jalur Onsite)</h2>
        <p className="text-xs text-slate-500 mt-1">
          Input pendaftaran langsung di sekolah bagi orang tua calon siswa yang mendaftar secara tatap muka, lengkap dengan unggah berkas (Akta, Pas Foto, dan KIA).
        </p>
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3 flex items-center justify-between">
          <span>{pesan}</span>
          <button
            type="button"
            onClick={() => setPesan('')}
            className="text-amber-800 font-bold hover:underline cursor-pointer text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Bagian Identitas Orang Tua / Wali */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
          1. Data Orang Tua / Wali Siswa
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-xs space-y-1 block">
            <span className="font-semibold text-slate-600">Nama Ayah</span>
            <input
              value={keluarga.namaAyah}
              onChange={(e) => setKeluarga({ ...keluarga, namaAyah: e.target.value })}
              placeholder="Nama lengkap ayah"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
            />
          </label>
          <label className="text-xs space-y-1 block">
            <span className="font-semibold text-slate-600">Nama Ibu</span>
            <input
              value={keluarga.namaIbu}
              onChange={(e) => setKeluarga({ ...keluarga, namaIbu: e.target.value })}
              placeholder="Nama lengkap ibu"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
            />
          </label>
          <label className="text-xs space-y-1 block">
            <span className="font-semibold text-slate-600">No. WhatsApp / HP Aktif *</span>
            <input
              required
              value={keluarga.noHp}
              onChange={(e) => setKeluarga({ ...keluarga, noHp: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
              placeholder="Contoh: 081234567890"
            />
          </label>
          <label className="text-xs space-y-1 block">
            <span className="font-semibold text-slate-600">Email Akun (Opsional)</span>
            <input
              type="email"
              value={keluarga.email}
              onChange={(e) => setKeluarga({ ...keluarga, email: e.target.value })}
              placeholder="orangtua@email.com"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-[#095c51]"
            />
          </label>
        </div>
      </div>

      {/* Bagian Data Calon Anak & Upload Berkas Persyaratan */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
            2. Data Calon Siswa &amp; Unggah Berkas Persyaratan
          </h3>
          <button
            type="button"
            onClick={() => setAnak((p) => [...p, { ...kosong }])}
            className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c51] text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Anak Lagi</span>
          </button>
        </div>

        {anak.map((a, i) => {
          return (
            <div
              key={i}
              className="space-y-4 border border-slate-200 bg-slate-50/50 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Calon Siswa #{i + 1}
                </span>
                {anak.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAnak((p) => p.filter((_, idx) => idx !== i))}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              {/* Data Identitas Anak */}
              <div className="grid md:grid-cols-5 gap-3">
                <label className="text-xs space-y-1 md:col-span-2 block">
                  <span className="font-semibold text-slate-600">Nama Lengkap Anak *</span>
                  <input
                    required
                    value={a.nama}
                    onChange={(e) => ubahAnak(i, { nama: e.target.value })}
                    placeholder="Nama lengkap anak"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                  />
                </label>
                <label className="text-xs space-y-1 block">
                  <span className="font-semibold text-slate-600">NIK (16 digit) *</span>
                  <input
                    required
                    maxLength={16}
                    inputMode="numeric"
                    pattern="\d{16}"
                    title="Tepat 16 digit angka"
                    value={a.nik}
                    onChange={(e) =>
                      ubahAnak(i, { nik: e.target.value.replace(/\D/g, '').slice(0, 16) })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                    placeholder="16 digit NIK"
                  />
                </label>
                <label className="text-xs space-y-1 block">
                  <span className="font-semibold text-slate-600">Tanggal Lahir *</span>
                  <input
                    required
                    type="date"
                    value={a.tglLahir}
                    onChange={(e) => ubahAnak(i, { tglLahir: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                  />
                </label>
                <label className="text-xs space-y-1 block">
                  <span className="font-semibold text-slate-600">Jenis Kelamin *</span>
                  <select
                    value={a.jenisKelamin}
                    onChange={(e) => ubahAnak(i, { jenisKelamin: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#095c51]"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </label>
              </div>

              {a.tglLahir && (() => {
                const kelayakan = cekKelayakanTanggalLahir(a.tglLahir);
                return (
                  <div
                    className={`text-[11px] px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 ${
                      kelayakan.valid
                        ? 'bg-teal-50 text-[#095c51] border border-teal-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{kelayakan.pesan}</span>
                  </div>
                );
              })()}

              {/* Upload Berkas Persyaratan Anak */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Lampiran Berkas (Akta, Pas Foto, KIA):
                </span>
                <div className="grid md:grid-cols-3 gap-3">
                  {/* Akta Kelahiran */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-[#095c51]" />
                      <span>Akta Kelahiran</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(e) => ubahAnak(i, { fileAkta: e.target.files?.[0] || null })}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-50 file:text-[#095c51] cursor-pointer"
                    />
                    {a.fileAkta && (
                      <span className="text-[10px] text-emerald-600 block truncate font-medium">
                        ✓ {a.fileAkta.name}
                      </span>
                    )}
                  </div>

                  {/* Pas Foto */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ImageIcon className="w-3.5 h-3.5 text-[#095c51]" />
                      <span>Pas Foto Anak</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => ubahAnak(i, { fileFoto: e.target.files?.[0] || null })}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-50 file:text-[#095c51] cursor-pointer"
                    />
                    {a.fileFoto && (
                      <span className="text-[10px] text-emerald-600 block truncate font-medium">
                        ✓ {a.fileFoto.name}
                      </span>
                    )}
                  </div>

                  {/* KIA */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-[#095c51]" />
                      <span>Kartu Identitas Anak (KIA)</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(e) => ubahAnak(i, { fileKia: e.target.files?.[0] || null })}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-50 file:text-[#095c51] cursor-pointer"
                    />
                    {a.fileKia && (
                      <span className="text-[10px] text-emerald-600 block truncate font-medium">
                        ✓ {a.fileKia.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3 bg-[#095c51] hover:bg-[#074840] text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>{loading ? 'Menyimpan Pendaftaran...' : 'Simpan Pendaftaran Onsite & Berkas'}</span>
        </button>
      </div>
    </form>
  );
}
