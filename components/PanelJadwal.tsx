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
  catatanOrangTua?: string | null;
  catatanBendahara?: string | null;
  slot: { idSlot: string; tanggal: string; jam: string };
  keluarga?: { namaAyah: string | null; namaIbu: string | null; noHp: string };
};

const DAFTAR_HARI = [
  { id: 1, label: 'Senin' },
  { id: 2, label: 'Selasa' },
  { id: 3, label: 'Rabu' },
  { id: 4, label: 'Kamis' },
  { id: 5, label: 'Jumat' },
  { id: 6, label: 'Sabtu' },
];

const tgl = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const jam = (s: string) => (s.includes('T') ? s.slice(11, 16) : s.slice(0, 5));

export default function PanelJadwal() {
  const [slot, setSlot] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking[]>([]);
  const [pesan, setPesan] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [form, setForm] = useState({ tanggal: '', jam: '08:30', kuota: '5' });
  const [loadingMuatUlang, setLoadingMuatUlang] = useState(false);
  const [hariAktif, setHariAktif] = useState<number[]>([3, 4, 5]);
  const [savingSettingHari, setSavingSettingHari] = useState(false);

  const muat = async () => {
    const [s, b] = await Promise.all([
      fetch('/api/slot-jadwal?future=1').then((x) => x.json()),
      fetch('/api/booking-kunjungan').then((x) => x.json()),
    ]);
    setSlot(s.data || []);
    if (s.pengaturanHari && Array.isArray(s.pengaturanHari) && s.pengaturanHari.length > 0) {
      setHariAktif(s.pengaturanHari);
    }
    setBooking(b.data || []);
  };

  useEffect(() => {
    muat();
  }, []);

  const toggleHari = (idHari: number) => {
    if (hariAktif.includes(idHari)) {
      if (hariAktif.length === 1) {
        alert('Minimal harus memilih 1 hari kunjungan.');
        return;
      }
      setHariAktif(hariAktif.filter((h) => h !== idHari));
    } else {
      setHariAktif([...hariAktif, idHari].sort());
    }
  };

  const simpanPengaturanHari = async () => {
    setSavingSettingHari(true);
    try {
      const res = await fetch('/api/slot-jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simpan_pengaturan_hari', hariAktif }),
      }).then((x) => x.json());
      setPesan(res.success ? res.message : res.error);
      await muat();
    } finally {
      setSavingSettingHari(false);
    }
  };

  const simpanSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSlotId) {
      const res = await fetch('/api/slot-jadwal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idSlot: editingSlotId,
          tanggal: form.tanggal,
          jam: form.jam,
          kuota: Number(form.kuota),
        }),
      }).then((x) => x.json());
      setPesan(res.success ? res.message : res.error);
      if (res.success) {
        setEditingSlotId(null);
        setForm({ tanggal: '', jam: '08:30', kuota: '5' });
        muat();
      }
    } else {
      const res = await fetch('/api/slot-jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kuota: Number(form.kuota) }),
      }).then((x) => x.json());
      setPesan(res.success ? res.message : res.error);
      if (res.success) {
        setForm({ tanggal: '', jam: '08:30', kuota: '5' });
        muat();
      }
    }
  };

  const mulaiEditSlot = (s: Slot) => {
    setEditingSlotId(s.idSlot);
    setForm({
      tanggal: s.tanggal.split('T')[0],
      jam: jam(s.jam),
      kuota: String(s.kuota),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const batalEdit = () => {
    setEditingSlotId(null);
    setForm({ tanggal: '', jam: '08:30', kuota: '5' });
  };

  const muatUlangSlotOtomatis = async () => {
    setLoadingMuatUlang(true);
    try {
      const res = await fetch('/api/slot-jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'muat_ulang_rabu_kamis_jumat', minggu: 2 }),
      }).then((x) => x.json());
      setPesan(res.success ? res.message : res.error);
      await muat();
    } finally {
      setLoadingMuatUlang(false);
    }
  };

  const hapusSlot = async (idSlot: string) => {
    if (!confirm('Hapus slot kedatangan ini?')) return;
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
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span>{pesan}</span>
          <button onClick={() => setPesan('')} className="text-amber-600 font-bold ml-2 cursor-pointer">×</button>
        </div>
      )}

      {/* 1. Pengaturan Hari Onsite Sekolah oleh Bendahara */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-teal-50 text-[#095c51] flex items-center justify-center text-xs font-black">✓</span>
              <span>Penyetelan Hari Kunjungan Onsite Sekolah</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih hari operasional kunjungan orang tua (Default: <strong>Rabu, Kamis, dan Jumat</strong>). Jadwal yang sudah lewat tanggal & harinya otomatis terhapus dan diperbarui sesuai hari aktif ini.
            </p>
          </div>
          <button
            type="button"
            onClick={simpanPengaturanHari}
            disabled={savingSettingHari}
            className="px-4 py-2 bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
          >
            {savingSettingHari ? 'Menyimpan...' : 'Simpan & Terapkan Hari'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {DAFTAR_HARI.map((h) => {
            const terpilih = hariAktif.includes(h.id);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => toggleHari(h.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                  terpilih
                    ? 'bg-teal-50 border-[#095c51] text-[#095c51] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[10px] ${
                  terpilih ? 'bg-[#095c51] text-white' : 'border border-slate-300'
                }`}>
                  {terpilih ? '✓' : ''}
                </span>
                <span>{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Form Tambah / Edit Slot Manual */}
      <form onSubmit={simpanSlot} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {editingSlotId ? 'Edit Tanggal, Jam & Kuota Slot Kunjungan' : 'Tambah Slot Jadwal Kunjungan Onsite'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bendahara dapat menambah slot manual atau mengedit tanggal & jam slot yang sudah ada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={muatUlangSlotOtomatis}
              disabled={loadingMuatUlang}
              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c51] text-xs font-bold border border-teal-200 transition cursor-pointer disabled:opacity-50"
            >
              {loadingMuatUlang ? 'Memuat...' : '↻ Muat Ulang Slot Sesuai Hari Aktif'}
            </button>
            {editingSlotId && (
              <button
                type="button"
                onClick={batalEdit}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-700">Tanggal Kunjungan</span>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#095c51] outline-none"
              required
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-700">Waktu / Jam Kedatangan</span>
            <input
              type="time"
              value={form.jam}
              onChange={(e) => setForm({ ...form, jam: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#095c51] outline-none"
              required
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-700">Kuota Orang Tua / Sesi</span>
            <input
              type="number"
              min={1}
              value={form.kuota}
              onChange={(e) => setForm({ ...form, kuota: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#095c51] outline-none"
              required
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-5 py-2.5 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer transition shadow-xs"
            >
              {editingSlotId ? 'Simpan Perubahan' : 'Tambah Slot'}
            </button>
          </div>
        </div>
      </form>

      {/* 3. Tabel Slot Tersedia */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Slot Kunjungan Tersedia</h2>
            <p className="text-xs text-slate-500 mt-0.5">{slot.length} slot aktif mendatang (jadwal yang sudah lewat otomatis dihapus).</p>
          </div>
        </div>
        {slot.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada slot kunjungan mendatang. Klik tombol <strong>Muat Ulang Slot</strong> di atas untuk membuat jadwal otomatis.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Hari & Tanggal</th>
                <th className="text-left px-3 py-3 font-semibold">Jam</th>
                <th className="text-left px-3 py-3 font-semibold">Kuota</th>
                <th className="text-left px-3 py-3 font-semibold">Sisa Kuota</th>
                <th className="text-right px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slot.map((s) => (
                <tr key={s.idSlot} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-semibold text-slate-900">{tgl(s.tanggal)}</td>
                  <td className="px-3 py-3 text-slate-700 font-medium">{jam(s.jam)} WIB</td>
                  <td className="px-3 py-3 text-slate-600">{s.kuota}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      s.sisa === 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {s.sisa === 0 ? 'Penuh' : `Sisa ${s.sisa}`}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => mulaiEditSlot(s)}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#095c51] font-bold cursor-pointer transition mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => hapusSlot(s.idSlot)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold cursor-pointer transition"
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

      {/* 4. Tabel Pemesanan Kunjungan */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Pemesanan Kunjungan Orang Tua</h2>
          <p className="text-xs text-slate-500 mt-1">{booking.length} total pemesanan aktif.</p>
        </div>
        {booking.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">Belum ada pemesanan kunjungan dari orang tua.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Keluarga</th>
                <th className="text-left px-3 py-3 font-semibold">Jadwal Slot</th>
                <th className="text-left px-3 py-3 font-semibold">Catatan Keperluan</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-right px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {booking.map((b) => (
                <tr key={b.idBooking} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-semibold text-slate-900">
                    {b.keluarga?.namaAyah || b.keluarga?.namaIbu || '-'}
                    <span className="block text-[10px] text-slate-500 font-normal">{b.keluarga?.noHp}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <span className="font-semibold text-slate-900">{tgl(b.slot.tanggal)}</span>
                    <span className="block text-[10px] text-slate-500">Pukul {jam(b.slot.jam)} WIB</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 max-w-xs truncate">
                    {b.catatanOrangTua || '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      b.status === 'DIKONFIRMASI'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'MENUNGGU'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'SELESAI'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-1.5">
                    {b.status === 'MENUNGGU' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'DIKONFIRMASI')}
                        className="px-3 py-1.5 rounded-lg bg-[#095c51] hover:bg-[#074840] text-white font-bold cursor-pointer transition shadow-2xs"
                      >
                        Konfirmasi
                      </button>
                    )}
                    {b.status === 'DIKONFIRMASI' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'SELESAI')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition shadow-2xs"
                      >
                        Selesai
                      </button>
                    )}
                    {b.status !== 'DIBATALKAN' && b.status !== 'SELESAI' && (
                      <button
                        onClick={() => ubahStatus(b.idBooking, 'DIBATALKAN')}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold cursor-pointer transition"
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
