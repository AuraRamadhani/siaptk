'use client';

import React, { useEffect, useState } from 'react';
import { CalendarPlus, ChevronRight, GraduationCap, RefreshCw } from 'lucide-react';
import { useDialog } from '@/components/Dialog';

type Kelompok = {
  idKelompok: string;
  nama: string;
  usiaMin: number;
  usiaMaks: number;
  riwayatKelompok: { idRiwayat: string; anak: { idAnak: string; nama: string; nik: string } }[];
};

type Hasil = {
  tahunAjaran: { periode: string; tanggalAcuan?: string | null };
  kelompok: Kelompok[];
  belumKelompok: { idAnak: string; nama: string; nik: string }[];
};

type TahunAjaran = {
  idTahunAjaran: string;
  periode: string;
  statusAktif: boolean;
  tanggalAcuan?: string | null;
  _count?: { riwayatKelompok: number };
};

type BarisRencana = {
  idAnak: string;
  nama: string;
  nik: string;
  usia: number;
  kelompokLama: string | null;
  kelompokBaru: string | null;
  hasil: 'NAIK' | 'TETAP' | 'LULUS' | 'GAGAL';
  alasan?: string;
};

type RingkasanKenaikan = {
  tahunAjaran: string;
  acuan: string;
  naik: number;
  lulus: number;
  gagal: number;
  tetap: number;
  rincian: BarisRencana[];
};

const WARNA_HASIL: Record<string, string> = {
  NAIK: 'bg-emerald-50 text-emerald-700',
  TETAP: 'bg-slate-100 text-slate-600',
  LULUS: 'bg-sky-50 text-sky-700',
  GAGAL: 'bg-rose-50 text-rose-700',
};

const LABEL_HASIL: Record<string, string> = {
  NAIK: 'Naik kelompok',
  TETAP: 'Tetap',
  LULUS: 'Lulus',
  GAGAL: 'Tidak dapat diproses',
};

/** Siswa tanpa kelompok lama berarti baru masuk, bukan naik tingkat. */
const labelHasil = (b: BarisRencana) =>
  b.hasil === 'NAIK' && !b.kelompokLama ? 'Kelompok Baru' : LABEL_HASIL[b.hasil];

export default function PanelKelompok() {
  const { konfirmasi } = useDialog();
  const [data, setData] = useState<Hasil | null>(null);
  const [daftarTahun, setDaftarTahun] = useState<TahunAjaran[]>([]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);
  const [rencana, setRencana] = useState<RingkasanKenaikan | null>(null);
  const [memproses, setMemproses] = useState(false);

  const muat = async () => {
    const [k, t] = await Promise.all([
      fetch('/api/pengelompokan', { cache: 'no-store' }).then((x) => x.json()),
      fetch('/api/tahun-ajaran', { cache: 'no-store' }).then((x) => x.json()).catch(() => ({})),
    ]);
    if (k.success) setData(k.data);
    else setPesan(k.error);
    if (t?.success) setDaftarTahun(t.data || []);
    setLoading(false);
  };

  useEffect(() => {
    // setState terjadi setelah await di dalam muat(), bukan sinkron di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muat();
  }, []);

  /** Buat tahun ajaran berikutnya dan langsung aktifkan. */
  const tambahTahun = async () => {
    const lanjut = await konfirmasi({
      judul: 'Buat Tahun Ajaran Baru',
      pesan: 'Sistem akan membuat tahun ajaran berikutnya dan langsung mengaktifkannya. Tahun ajaran lama tetap tersimpan beserta riwayat kelompoknya.',
      tipe: 'info',
      labelOk: 'Buat & Aktifkan',
    });
    if (!lanjut) return;
    setMemproses(true);
    const res = await fetch('/api/tahun-ajaran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktifkan: true }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    setMemproses(false);
    setRencana(null);
    await muat();
  };

  const aktifkanTahun = async (t: TahunAjaran) => {
    const lanjut = await konfirmasi({
      judul: 'Aktifkan Tahun Ajaran',
      pesan: `Jadikan ${t.periode} sebagai tahun ajaran aktif? Tahun ajaran lain akan otomatis dinonaktifkan.`,
      tipe: 'warning',
      labelOk: 'Aktifkan',
    });
    if (!lanjut) return;
    setMemproses(true);
    const res = await fetch('/api/tahun-ajaran', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idTahunAjaran: t.idTahunAjaran }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    setMemproses(false);
    setRencana(null);
    await muat();
  };

  /** Pratinjau: hitung siapa naik, siapa lulus, siapa gagal. Tidak mengubah data. */
  const pratinjau = async () => {
    setMemproses(true);
    const res = await fetch('/api/pengelompokan', { method: 'POST' }).then((x) => x.json());
    if (res.success) {
      setRencana(res.data);
      setPesan(res.message);
    } else {
      setPesan(res.error);
    }
    setMemproses(false);
  };

  /** Terapkan hasil pratinjau. */
  const terapkan = async () => {
    if (!rencana) return;
    const lanjut = await konfirmasi({
      judul: `Terapkan Kenaikan ${rencana.tahunAjaran}`,
      pesan:
        `${rencana.naik} siswa naik kelompok, ${rencana.lulus} ditandai lulus, ` +
        `${rencana.tetap} tetap, ${rencana.gagal} tidak dapat diproses.\n\n` +
        'Siswa yang ditandai lulus tidak lagi muncul di daftar siswa aktif.',
      tipe: 'warning',
      labelOk: 'Terapkan',
    });
    if (!lanjut) return;

    setMemproses(true);
    const res = await fetch('/api/pengelompokan?terapkan=1', { method: 'POST' }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    setMemproses(false);
    setRencana(null);
    await muat();
  };

  const keluarkan = async (idRiwayat: string, nama: string) => {
    const lanjut = await konfirmasi({
      judul: 'Keluarkan dari Kelompok',
      pesan: `${nama} akan dikeluarkan dari kelompok pada tahun ajaran ini. Riwayat sebelumnya tetap tersimpan.`,
      tipe: 'danger',
      labelOk: 'Keluarkan',
    });
    if (!lanjut) return;
    const res = await fetch(`/api/pengelompokan?idRiwayat=${encodeURIComponent(idRiwayat)}`, {
      method: 'DELETE',
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) await muat();
  };

  if (loading && !data) return <div className="p-6 text-xs text-slate-500">Memuat…</div>;

  const tahunAktif = daftarTahun.find((t) => t.statusAktif);

  return (
    <div className="space-y-6">
      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      {/* Tahun ajaran */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Tahun Ajaran</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tahun aktif: <strong>{tahunAktif?.periode ?? data?.tahunAjaran?.periode ?? '-'}</strong>
              {tahunAktif?.tanggalAcuan && (
                <> · acuan usia {new Date(tahunAktif.tanggalAcuan).toLocaleDateString('id-ID')}</>
              )}
              {!tahunAktif?.tanggalAcuan && tahunAktif?.periode && (
                <> · acuan usia 1 Juli {String(tahunAktif.periode).slice(0, 4)}</>
              )}
            </p>
          </div>
          <button
            onClick={tambahTahun}
            disabled={memproses}
            className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Tahun Ajaran Baru</span>
          </button>
        </div>

        {daftarTahun.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {daftarTahun.map((t) => (
              <button
                key={t.idTahunAjaran}
                onClick={() => !t.statusAktif && aktifkanTahun(t)}
                disabled={t.statusAktif || memproses}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  t.statusAktif
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                }`}
                title={t.statusAktif ? 'Sedang aktif' : 'Klik untuk mengaktifkan'}
              >
                {t.periode}
                {t._count ? <span className="ml-1 font-normal text-slate-400">({t._count.riwayatKelompok})</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kenaikan kelompok */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#095c51]" />
              <span>Kenaikan Kelompok</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Usia dihitung per tanggal acuan tahun ajaran aktif. KB (3–4 th) → TK A (4–5 th) → TK B (5–6 th) →
              lulus.
            </p>
          </div>
          <button
            onClick={pratinjau}
            disabled={memproses}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${memproses ? 'animate-spin' : ''}`} />
            <span>Lihat Pratinjau</span>
          </button>
        </div>

        {rencana && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Naik kelompok', nilai: rencana.naik, warna: 'text-emerald-700' },
                { label: 'Lulus', nilai: rencana.lulus, warna: 'text-sky-700' },
                { label: 'Tetap', nilai: rencana.tetap, warna: 'text-slate-700' },
                { label: 'Gagal', nilai: rencana.gagal, warna: 'text-rose-700' },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
                  <p className={`text-lg font-black ${k.warna}`}>{k.nilai}</p>
                </div>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Nama</th>
                    <th className="text-left px-3 py-2 font-semibold">Usia</th>
                    <th className="text-left px-3 py-2 font-semibold">Dari</th>
                    <th className="text-left px-3 py-2 font-semibold">Ke</th>
                    <th className="text-left px-4 py-2 font-semibold">Hasil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rencana.rincian.map((b) => (
                    <tr key={b.idAnak}>
                      <td className="px-4 py-2 font-semibold text-slate-900">{b.nama}</td>
                      <td className="px-3 py-2 text-slate-600">{b.usia} th</td>
                      <td className="px-3 py-2 text-slate-500">{b.kelompokLama ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{b.kelompokBaru ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${WARNA_HASIL[b.hasil]}`}>
                          {labelHasil(b)}
                        </span>
                        {b.alasan && <span className="block text-[10px] text-slate-400 mt-0.5">{b.alasan}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-500">
                Acuan usia: <strong>{rencana.acuan}</strong>. Pratinjau belum mengubah data.
              </p>
              <button
                onClick={terapkan}
                disabled={memproses || (rencana.naik === 0 && rencana.lulus === 0)}
                className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Terapkan Kenaikan</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Isi kelompok tahun aktif */}
      <div className="grid md:grid-cols-2 gap-6">
        {(data?.kelompok || []).map((k) => (
          <div key={k.idKelompok} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {k.nama} <span className="text-xs font-normal text-slate-500">({k.usiaMin}–{k.usiaMaks} th)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">{k.riwayatKelompok.length} siswa.</p>
            </div>
            {k.riwayatKelompok.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">Belum ada siswa.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {k.riwayatKelompok.map((r) => (
                  <li key={r.idRiwayat} className="px-6 py-2.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{r.anak.nama}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-500">{r.anak.nik}</span>
                      <button
                        onClick={() => keluarkan(r.idRiwayat, r.anak.nama)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Keluarkan
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {(data?.belumKelompok.length ?? 0) > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="text-sm font-bold text-amber-900">Belum Dikelompokkan</h3>
            <p className="text-xs text-amber-700 mt-1">{data?.belumKelompok.length} siswa menunggu.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data?.belumKelompok.map((a) => (
              <li key={a.idAnak} className="px-6 py-2.5 flex justify-between text-xs">
                <span className="font-semibold text-slate-800">{a.nama}</span>
                <span className="text-slate-500">{a.nik}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
