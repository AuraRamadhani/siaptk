'use client';

import React, { useEffect, useState } from 'react';

type Slot = { idSlot: string; tanggal: string; jam: string; kuota: number; sisa: number };
type Booking = {
  idBooking: string;
  status: string;
  slot: { idSlot: string; tanggal: string; jam: string };
};

const tgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const jam = (s: string) => new Date(s).toTimeString().slice(0, 5);

export default function PanelBookingOrangTua() {
  const [slot, setSlot] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking[]>([]);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);

  const muat = async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      fetch('/api/slot-jadwal?future=1').then((x) => x.json()),
      fetch('/api/booking-kunjungan').then((x) => x.json()),
    ]);
    setSlot(s.data || []);
    setBooking(b.data || []);
    setLoading(false);
  };

  useEffect(() => {
    muat();
  }, []);

  const pesanSlot = async (idSlot: string) => {
    const res = await fetch('/api/booking-kunjungan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idSlot }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  const batal = async (idBooking: string) => {
    const res = await fetch('/api/booking-kunjungan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idBooking, status: 'DIBATALKAN' }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  const sudahPesan = (idSlot: string) =>
    booking.some((b) => b.slot.idSlot === idSlot && b.status !== 'DIBATALKAN');

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Pesan Kunjungan</h1>
        <p className="text-xs text-slate-500 mt-1">Pilih slot jadwal kunjungan ke kantor sekolah.</p>
      </div>

      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      {booking.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Pemesanan Saya</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {booking.map((b) => (
              <li key={b.idBooking} className="px-6 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900">
                    {tgl(b.slot.tanggal)} · {jam(b.slot.jam)}
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      b.status === 'DIKONFIRMASI'
                        ? 'bg-emerald-50 text-emerald-700'
                        : b.status === 'DIBATALKAN'
                          ? 'bg-slate-100 text-slate-500'
                          : b.status === 'SELESAI'
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                {(b.status === 'MENUNGGU' || b.status === 'DIKONFIRMASI') && (
                  <button
                    onClick={() => batal(b.idBooking)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer"
                  >
                    Batalkan
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Slot Tersedia</h2>
          <p className="text-xs text-slate-500 mt-1">{slot.length} slot mendatang.</p>
        </div>
        {loading ? (
          <div className="p-6 text-xs text-slate-500">Memuat…</div>
        ) : slot.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">Belum ada slot tersedia. Hubungi sekolah.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {slot.map((s) => {
              const penuh = s.sisa === 0;
              const dipesan = sudahPesan(s.idSlot);
              return (
                <li key={s.idSlot} className="px-6 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">
                      {tgl(s.tanggal)} · {jam(s.jam)}
                    </span>
                    <span className="ml-2 text-[11px] text-slate-500">
                      sisa {s.sisa}/{s.kuota}
                    </span>
                  </div>
                  <button
                    disabled={penuh || dipesan}
                    onClick={() => pesanSlot(s.idSlot)}
                    className="px-4 py-2 rounded-xl bg-[#095c51] text-white text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {dipesan ? 'Sudah dipesan' : penuh ? 'Penuh' : 'Pesan'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
