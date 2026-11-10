'use client';

import React, { useEffect, useState } from 'react';

type Slot = {
  idSlot: string;
  tanggal: string;
  jam: string;
  kuota: number;
  sisa: number;
};

type Booking = {
  idBooking: string;
  status: string;
  slot: { idSlot: string; tanggal: string; jam: string };
  keluarga?: { namaAyah: string | null; namaIbu: string | null; noHp: string };
};

const tgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const jam = (s: string) => (s.includes('T') ? s.slice(11, 16) : s.slice(0, 5));

export default function PanelJadwal() {
  const [slot, setSlot] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking[]>([]);
  const [pesan, setPesan] = useState('');
  const [form, setForm] = useState({ tanggal: '', jam: '08:00', kuota: '5' });

  const muat = async () => {
    const [s, b] = await Promise.all([
      fetch('/api/slot-jadwal?future=1').then((x) => x.json()),
      fetch('/api/booking-kunjungan').then((x) => x.json()),
    ]);
    setSlot(s.data || []);
    setBooking(b.data || []);
  };

  useEffect(() => {
    // setState terjadi setelah await, bukan sinkron di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, []);

  const buatSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/slot-jadwal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, kuota: Number(form.kuota) }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    if (res.success) {
      setForm({ tanggal: '', jam: '08:00', kuota: '5' });
      muat();
    }
  };

  const hapusSlot = async (idSlot: string) => {
    const res = await fetch(`/api/slot-jadwal?idSlot=${idSlot}`, { method: 'DELETE' }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  const ubahStatus = async (idBooking: string, status: string) => {
    const res = await fetch('/api/booking-kunjungan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idBooking, status }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  return (
    <div className="space-y-6">
      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <form onSubmit={buatSlot} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Buat Slot Jadwal</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Tanggal</span>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Jam</span>
            <input
              type="time"
              value={form.jam}
              onChange={(e) => setForm({ ...form, jam: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Kuota</span>
            <input
              type="number"
              min={1}
              value={form.kuota}
              onChange={(e) => setForm({ ...form, kuota: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="w-full px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer">
              Tambah Slot
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Slot Tersedia</h2>
          <p className="text-xs text-slate-500 mt-1">{slot.length} slot mendatang.</p>
        </div>
        {slot.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">Belum ada slot.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Tanggal</th>
                <th className="text-left px-3 py-3 font-semibold">Jam</th>
                <th className="text-left px-3 py-3 font-semibold">Kuota</th>
                <th className="text-left px-3 py-3 font-semibold">Sisa</th>
                <th className="text-right px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {slot.map((s) => (
                <tr key={s.idSlot} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-semibold text-slate-900">{tgl(s.tanggal)}</td>
                  <td className="px-3 py-3 text-slate-600">{jam(s.jam)}</td>
                  <td className="px-3 py-3 text-slate-600">{s.kuota}</td>
                  <td className="px-3 py-3">
                    <span className={s.sisa === 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>{s.sisa}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => hapusSlot(s.idSlot)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Pemesanan Kunjungan</h2>
          <p className="text-xs text-slate-500 mt-1">{booking.length} pemesanan.</p>
        </div>
        {booking.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">Belum ada pemesanan.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Keluarga</th>
                <th className="text-left px-3 py-3 font-semibold">Slot</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-right px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {booking.map((b) => (
                <tr key={b.idBooking} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-semibold text-slate-900">
                    {b.keluarga?.namaAyah || b.keluarga?.namaIbu || '-'}
                    <span className="block text-[10px] text-slate-500 font-normal">{b.keluarga?.noHp}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {tgl(b.slot.tanggal)} · {jam(b.slot.jam)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">{b.status}</span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    {b.status === 'MENUNGGU' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'DIKONFIRMASI')}
                        className="px-3 py-1.5 rounded-lg bg-[#095c51] text-white font-bold cursor-pointer"
                      >
                        Konfirmasi
                      </button>
                    )}
                    {b.status === 'DIKONFIRMASI' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'SELESAI')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        Selesai
                      </button>
                    )}
                    {b.status !== 'DIBATALKAN' && b.status !== 'SELESAI' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'DIBATALKAN')}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
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
