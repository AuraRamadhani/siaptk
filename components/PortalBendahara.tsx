'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Trx = {
  idTransaksi: string;
  jenis: 'SETOR' | 'TARIK' | 'BAYAR_SPP';
  metode: string;
  nominal: string | number;
  keterangan: string | null;
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

const rp = (n: number) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const LABEL: Record<string, string> = { SETOR: 'Setoran', TARIK: 'Penarikan', BAYAR_SPP: 'Bayar SPP' };

export default function PortalBendahara() {
  const [tab, setTab] = useState<'verifikasi' | 'tunai' | 'rekonsiliasi'>('verifikasi');
  const [antrean, setAntrean] = useState<Trx[]>([]);
  const [terverifikasi, setTerverifikasi] = useState<Trx[]>([]);
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string>('');
  const [idAnak, setIdAnak] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const muat = async () => {
    setLoading(true);
    try {
      const [a, v, r] = await Promise.all([
        fetch('/api/tabungan?status=MENUNGGU').then((x) => x.json()),
        fetch('/api/tabungan?status=DIVERIFIKASI').then((x) => x.json()),
        fetch('/api/tabungan').then((x) => x.json()),
      ]);
      setAntrean(a.data || []);
      setTerverifikasi(v.data || []);
      setRekening(r.data || []);
    } catch (e) {
      setPesan('Gagal memuat data tabungan.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const putuskan = async (idTransaksi: string, aksi: 'verifikasi' | 'tolak') => {
    const res = await fetch('/api/tabungan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idTransaksi, aksi, diverifikasiOleh: 'Bendahara' }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portal Bendahara</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verifikasi setoran, catat transaksi tunai, dan rekonsiliasi mingguan.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total saldo siswa</div>
          <div className="text-xl font-extrabold text-[#095c51]">{rp(totalSaldo)}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ['verifikasi', `Verifikasi (${antrean.length})`],
          ['tunai', 'Setoran Tunai'],
          ['rekonsiliasi', 'Rekonsiliasi Mingguan'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === k ? 'bg-[#095c51] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      {tab === 'verifikasi' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Menunggu Verifikasi</h2>
            <button onClick={muat} className="text-xs font-semibold text-[#095c51] cursor-pointer">
              Muat ulang
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-xs text-slate-500">Memuat…</div>
          ) : antrean.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">Tidak ada pengajuan menunggu.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Siswa</th>
                  <th className="text-left px-3 py-3 font-semibold">Jenis</th>
                  <th className="text-right px-3 py-3 font-semibold">Nominal</th>
                  <th className="text-left px-3 py-3 font-semibold">Waktu</th>
                  <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {antrean.map((t) => (
                  <tr key={t.idTransaksi} className="border-t border-slate-100">
                    <td className="px-6 py-3 font-semibold text-slate-900">{t.tabungan?.anak?.nama || '-'}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {LABEL[t.jenis]} · {t.metode}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{rp(Number(t.nominal))}</td>
                    <td className="px-3 py-3 text-slate-500">{tgl(t.createdAt)}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => putuskan(t.idTransaksi, 'verifikasi')}
                        className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                      >
                        Verifikasi
                      </button>
                      <button
                        onClick={() => putuskan(t.idTransaksi, 'tolak')}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold cursor-pointer"
                      >
                        Tolak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
  );
}