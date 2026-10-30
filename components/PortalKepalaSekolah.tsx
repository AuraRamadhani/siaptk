'use client';

import React, { useEffect, useState } from 'react';

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
  keluarga?: { namaAyah: string | null; namaIbu: string | null; noHp: string };
};

const rp = (n: number) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

export default function PortalKepalaSekolah() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [pendaftar, setPendaftar] = useState<Pendaftar[]>([]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);

  const muat = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        fetch('/api/dashboard').then((x) => x.json()),
        fetch('/api/pendaftaran').then((x) => x.json()),
      ]);
      setData(d.data || null);
      setPendaftar(p.data || []);
    } catch (e) {
      setPesan('Gagal memuat dashboard.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const tetapkan = async (idAnak: string, aksi: 'terima' | 'batal') => {
    const res = await fetch('/api/pendaftaran', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idAnak, aksi }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  if (loading && !data) return <div className="p-8 text-xs text-slate-500">Memuat dashboard…</div>;

  const kpi = [
    { label: 'Siswa aktif', nilai: String(data?.siswa.aktif ?? 0), sub: `${data?.siswa.pendaftar ?? 0} pendaftar` },
    { label: 'Saldo tabungan', nilai: rp(data?.keuangan.totalSaldo ?? 0), sub: 'seluruh siswa' },
    { label: 'Tunggakan', nilai: rp(data?.keuangan.tunggakan ?? 0), sub: `${data?.keuangan.persenTertagih ?? 0}% tertagih` },
    {
      label: 'Antrean verifikasi',
      nilai: String(data?.bulanIni.antreanVerifikasi ?? 0),
      sub: 'transaksi menunggu',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Kepala Sekolah</h1>
        <p className="text-xs text-slate-500 mt-1">Rekapitulasi keuangan dan penetapan penerimaan siswa baru.</p>
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map((k) => (
          <div key={k.label} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{k.label}</div>
            <div className="text-xl font-extrabold text-slate-900 mt-2">{k.nilai}</div>
            <div className="text-[11px] text-slate-500 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Penerimaan per jenis tagihan — bar CSS tanpa library */}
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
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-[11px] text-emerald-700 font-semibold">Setoran</div>
              <div className="text-sm font-extrabold text-emerald-800 mt-1">{rp(data?.bulanIni.setor ?? 0)}</div>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <div className="text-[11px] text-red-700 font-semibold">Penarikan/SPP</div>
              <div className="text-sm font-extrabold text-red-800 mt-1">{rp(data?.bulanIni.tarik ?? 0)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
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
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Penetapan Penerimaan Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">{pendaftar.length} calon siswa menunggu penetapan.</p>
        </div>
        {pendaftar.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">Tidak ada calon siswa yang menunggu penetapan.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Nama</th>
                <th className="text-left px-3 py-3 font-semibold">NIK</th>
                <th className="text-left px-3 py-3 font-semibold">Orang tua</th>
                <th className="text-right px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pendaftar.map((p) => (
                <tr key={p.idAnak} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-semibold text-slate-900">{p.nama}</td>
                  <td className="px-3 py-3 text-slate-600">{p.nik}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {p.keluarga?.namaAyah || '-'} / {p.keluarga?.namaIbu || '-'}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button
                      onClick={() => tetapkan(p.idAnak, 'terima')}
                      className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                    >
                      Terima
                    </button>
                    <button
                      onClick={() => tetapkan(p.idAnak, 'batal')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}