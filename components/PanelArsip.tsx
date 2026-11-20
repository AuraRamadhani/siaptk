'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Download, X } from 'lucide-react';
import Paginasi, { usePaginasi } from '@/components/Paginasi';
import { useDialog } from '@/components/Dialog';

type TahunAjaran = { idTahunAjaran: string; periode: string };
type Riwayat = { idRiwayat: string; kelompok: { nama: string }; tahunAjaran: { periode: string } };
type Berkas = { idBerkasAnak: string; akta: string | null; foto: string | null; kia: string | null; statusVerifikasi: string };
type BerkasKeluargaItem = { idBerkasKel: string; jenis: 'KK' | 'KTP_ORTU'; file: string; statusVerifikasi: string };
type Anak = {
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  status: string;
  jenisKelamin: string;
  jalurPendaftaran: string;
  alasanPenolakan?: string | null;
  keluarga: {
    namaAyah: string | null;
    namaIbu: string | null;
    noHp: string;
    fileKK?: string | null;
    fileKTP?: string | null;
    berkasKeluarga?: BerkasKeluargaItem[];
  };
  berkasAnak: Berkas[] | Berkas | null;
  riwayatKelompok: Riwayat[];
};

const tgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const keUrlBerkas = (file: string) => (file.startsWith('/') || file.startsWith('http') ? file : `/uploads/${file}`);

/** Label bahasa Indonesia untuk status siswa. */
const LABEL_STATUS_ANAK: Record<string, string> = {
  PENDAFTAR: 'Pendaftar',
  AKTIF: 'Aktif',
  LULUS: 'Lulus',
  BERHENTI: 'Berhenti',
  PINDAH: 'Pindah',
};

/** Status yang wajib disertai alasan. */
const PERLU_ALASAN = ['BERHENTI', 'PINDAH'];

export default function PanelArsip({
  mode = 'semua',
}: {
  mode?: 'verifikasi_pendaftaran' | 'arsip_aktif' | 'semua';
}) {
  const [data, setData] = useState<Anak[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [cari, setCari] = useState('');
  const [tahun, setTahun] = useState('');
  const [status, setStatus] = useState(
    mode === 'verifikasi_pendaftaran' ? 'PENDAFTAR' : mode === 'arsip_aktif' ? 'AKTIF' : ''
  );
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewBerkas, setPreviewBerkas] = useState<{ label: string; url: string } | null>(null);
  const { beritahu } = useDialog();
  const halData = usePaginasi(data);

  // Modal ubah status siswa (berhenti / pindah / lulus / aktif kembali)
  const [modalStatus, setModalStatus] = useState<{ idAnak: string; nama: string; status: string } | null>(null);
  const [statusBaru, setStatusBaru] = useState('AKTIF');
  const [alasanStatus, setAlasanStatus] = useState('');
  const [galatStatus, setGalatStatus] = useState('');

  const muat = async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (cari.trim()) q.set('cari', cari.trim());
    if (tahun) q.set('tahunAjaran', tahun);
    const targetStatus = mode === 'verifikasi_pendaftaran' ? 'PENDAFTAR' : mode === 'arsip_aktif' ? 'AKTIF' : status;
    if (targetStatus) q.set('status', targetStatus);
    // Mode verifikasi hanya menampilkan berkas yang benar-benar menunggu diperiksa,
    // sehingga tidak tercampur dengan pendaftar yang belum mengunggah berkas.
    if (mode === 'verifikasi_pendaftaran') q.set('perluVerifikasi', '1');

    const res = await fetch('/api/arsip?' + q.toString(), { cache: 'no-store' }).then((x) => x.json());
    if (res.success) {
      setData(res.data || []);
      setTahunList(res.tahunAjaranList || []);
    } else {
      setPesan(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // setState terjadi setelah await, bukan sinkron di badan effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, []);

  const [modalTolak, setModalTolak] = useState<{ tipe: 'anak' | 'keluarga'; id: string; nama: string } | null>(null);
  const [alasanTolakBerkas, setAlasanTolakBerkas] = useState('');

  const bukaModalTolak = (tipe: 'anak' | 'keluarga', id: string, nama: string) => {
    setModalTolak({ tipe, id, nama });
    setAlasanTolakBerkas('');
  };

  const konfirmasiTolak = async () => {
    if (!modalTolak) return;
    if (!alasanTolakBerkas.trim()) {
      await beritahu('Alasan penolakan berkas wajib diisi sebelum menyimpan.', {
        judul: 'Alasan Belum Diisi',
        tipe: 'warning',
      });
      return;
    }
    await verifikasi(modalTolak.tipe, modalTolak.id, 'DITOLAK', alasanTolakBerkas.trim());
    setModalTolak(null);
    setAlasanTolakBerkas('');
  };

  const verifikasi = async (tipe: 'anak' | 'keluarga', id: string, st: string, catatanPenolakan?: string) => {
    const res = await fetch('/api/arsip', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe, id, status: st, catatanPenolakan }),
    }).then((x) => x.json());
    setPesan(res.success ? res.message : res.error);
    muat();
  };

  /** Simpan perubahan status siswa (aktif / lulus / berhenti / pindah). */
  const simpanStatus = async () => {
    if (!modalStatus) return;
    if (PERLU_ALASAN.includes(statusBaru) && !alasanStatus.trim()) {
      setGalatStatus(`Alasan ${statusBaru === 'PINDAH' ? 'pindah' : 'berhenti'} wajib diisi.`);
      return;
    }
    const res = await fetch('/api/anak', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idAnak: modalStatus.idAnak,
        status: statusBaru,
        alasanKeluar: PERLU_ALASAN.includes(statusBaru) ? alasanStatus.trim() : undefined,
      }),
    }).then((x) => x.json());

    if (res.success) {
      setPesan(res.message);
      setModalStatus(null);
      setAlasanStatus('');
      setGalatStatus('');
      await muat();
    } else {
      setGalatStatus(res.error || 'Gagal menyimpan status.');
    }
  };

  return (
    <div className="space-y-6">
      {pesan && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2">{pesan}</div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          {mode === 'verifikasi_pendaftaran'
            ? 'Pencarian Berkas Calon Siswa'
            : mode === 'arsip_aktif'
            ? 'Pencarian Arsip Siswa Aktif'
            : 'Pencarian Arsip Digital'}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            muat();
          }}
          className="grid md:grid-cols-4 gap-4"
        >
          <label className={`text-xs space-y-1 ${mode === 'semua' ? 'md:col-span-2' : 'md:col-span-3'}`}>
            <span className="font-semibold text-slate-600">Nama / NIK / Orang tua</span>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              placeholder="Cari nama atau NIK…"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Tahun ajaran</span>
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
            >
              <option value="">Semua</option>
              {tahunList.map((t) => (
                <option key={t.idTahunAjaran} value={t.idTahunAjaran}>
                  {t.periode}
                </option>
              ))}
            </select>
          </label>
          {mode === 'semua' && (
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="">Semua</option>
                <option value="AKTIF">Aktif</option>
                <option value="PENDAFTAR">Pendaftar</option>
                <option value="LULUS">Lulus</option>
                <option value="BERHENTI">Berhenti</option>
                <option value="PINDAH">Pindah</option>
              </select>
            </label>
          )}
          <div className="md:col-span-4">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#095c51] text-white text-xs font-bold cursor-pointer">
              Cari
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            {mode === 'verifikasi_pendaftaran'
              ? 'Verifikasi Berkas Calon Siswa (Pendaftar Baru)'
              : mode === 'arsip_aktif'
              ? 'Arsip Berkas Siswa Terdaftar (Aktif)'
              : 'Arsip Siswa & Berkas'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'verifikasi_pendaftaran'
              ? `${data.length} berkas calon siswa sudah diunggah dan menunggu diperiksa.`
              : mode === 'arsip_aktif'
              ? `${data.length} siswa aktif terdaftar dalam arsip.`
              : `${data.length} arsip ditemukan.`}
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-xs text-slate-500">Mencari…</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 space-y-1">
            {mode === 'verifikasi_pendaftaran' ? (
              <>
                <p className="font-semibold text-slate-700">Tidak ada berkas yang menunggu verifikasi.</p>
                <p>
                  Menu ini hanya menampilkan calon siswa yang sudah mengunggah Akta, Pas Foto, atau KIA.
                  Pendaftar yang belum mengunggah berkas tidak muncul di sini.
                </p>
              </>
            ) : (
              <p>Tidak ada arsip yang cocok.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Nama</th>
                  <th className="text-left px-3 py-3 font-semibold">NIK</th>
                  <th className="text-left px-3 py-3 font-semibold">Lahir</th>
                  <th className="text-left px-3 py-3 font-semibold">Orang tua</th>
                  <th className="text-left px-3 py-3 font-semibold">Kelompok</th>
                  <th className="text-left px-3 py-3 font-semibold">Berkas Anak</th>
                  <th className="text-left px-3 py-3 font-semibold">Berkas Keluarga</th>
                  <th className="text-right px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {halData.data.map((a) => {
                  const berkas = Array.isArray(a.berkasAnak) ? a.berkasAnak[0] : a.berkasAnak;
                  const kkRow = a.keluarga?.berkasKeluarga?.find((b) => b.jenis === 'KK');
                  const ktpRow = a.keluarga?.berkasKeluarga?.find((b) => b.jenis === 'KTP_ORTU');
                  const fileKK = kkRow?.file || a.keluarga?.fileKK || null;
                  const fileKTP = ktpRow?.file || a.keluarga?.fileKTP || null;

                  return (
                    <tr key={a.idAnak} className="border-t border-slate-100 align-top">
                      <td className="px-6 py-3 font-semibold text-slate-900">
                        {a.nama}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {a.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'} · {a.jalurPendaftaran}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{a.nik}</td>
                      <td className="px-3 py-3 text-slate-600">{tgl(a.tglLahir)}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {a.keluarga?.namaAyah || a.keluarga?.namaIbu || '-'}
                        <span className="block text-[10px] text-slate-500">{a.keluarga?.noHp}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {a.riwayatKelompok.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          a.riwayatKelompok.map((r) => (
                            <span key={r.idRiwayat} className="block">
                              {r.kelompok.nama} <span className="text-[10px] text-slate-400">({r.tahunAjaran.periode})</span>
                            </span>
                          ))
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 space-y-1">
                        {(['akta', 'foto', 'kia'] as const).map((j) => {
                          const file = berkas?.[j];
                          return (
                            <span key={j} className="block text-[10px]">
                              {file ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewBerkas({
                                      label: `${j.toUpperCase()} - ${a.nama}`,
                                      url: keUrlBerkas(file),
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[#095c51] hover:underline font-semibold cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{j.toUpperCase()}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400">{j.toUpperCase()} —</span>
                              )}
                            </span>
                          );
                        })}
                      </td>
                      <td className="px-3 py-3 text-slate-600 space-y-1">
                        <span className="block text-[10px]">
                          {fileKK ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBerkas({
                                  label: `Kartu Keluarga - ${a.keluarga?.namaAyah || a.nama}`,
                                  url: keUrlBerkas(fileKK),
                                })
                              }
                              className="inline-flex items-center gap-1 text-[#095c51] hover:underline font-semibold cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>KK</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">KK —</span>
                          )}
                        </span>
                        <span className="block text-[10px]">
                          {fileKTP ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewBerkas({
                                  label: `KTP Orang Tua - ${a.keluarga?.namaAyah || a.nama}`,
                                  url: keUrlBerkas(fileKTP),
                                })
                              }
                              className="inline-flex items-center gap-1 text-[#095c51] hover:underline font-semibold cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>KTP</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">KTP —</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {berkas ? (
                          <div className="space-y-1">
                            <span
                              className={`block px-2 py-1 rounded-md text-[10px] font-bold ${
                                berkas.statusVerifikasi === 'DIVERIFIKASI'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : berkas.statusVerifikasi === 'DITOLAK'
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {berkas.statusVerifikasi}
                            </span>
                            {berkas.statusVerifikasi !== 'DIVERIFIKASI' && (
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => verifikasi('anak', berkas.idBerkasAnak, 'DIVERIFIKASI')}
                                  className="flex-1 px-2 py-1 rounded-md bg-[#095c51] hover:bg-[#074840] text-white text-[10px] font-bold cursor-pointer transition"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => bukaModalTolak('anak', berkas.idBerkasAnak, a.nama)}
                                  className="flex-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer transition"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Belum ada berkas</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              a.status === 'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700'
                                : a.status === 'LULUS'
                                  ? 'bg-sky-50 text-sky-700'
                                  : a.status === 'BERHENTI' || a.status === 'PINDAH'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {LABEL_STATUS_ANAK[a.status] || a.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setModalStatus({ idAnak: a.idAnak, nama: a.nama, status: a.status });
                              setStatusBaru(a.status === 'AKTIF' ? 'BERHENTI' : 'AKTIF');
                              setAlasanStatus(a.alasanPenolakan || '');
                              setGalatStatus('');
                            }}
                            className="text-[10px] font-semibold text-[#095c51] hover:underline cursor-pointer"
                          >
                            Ubah Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginasi
          halaman={halData.halaman}
          totalHalaman={halData.totalHalaman}
          total={halData.total}
          perHalaman={halData.perHalaman}
          mulai={halData.mulai}
          onHalaman={halData.setHalaman}
          onPerHalaman={halData.gantiPerHalaman}
          satuan="siswa"
        />
      </div>

      {/* MODAL PREVIEW BERKAS */}
      {previewBerkas && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900">{previewBerkas.label}</h2>
              <button
                onClick={() => setPreviewBerkas(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-100 rounded-2xl min-h-[300px] flex items-center justify-center overflow-hidden">
              {previewBerkas.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewBerkas.url} className="w-full h-[60vh] border-0 rounded-xl" title={previewBerkas.label} />
              ) : (
                <img
                  src={previewBerkas.url}
                  alt={previewBerkas.label}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl"
                />
              )}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={previewBerkas.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh / Buka di Tab Baru</span>
              </a>
              <button
                onClick={() => setPreviewBerkas(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATATAN PENOLAKAN BERKAS (KEPALA SEKOLAH) */}
      {modalTolak && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Alasan Penolakan Berkas</h2>
              <button
                onClick={() => setModalTolak(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Siswa: <span className="font-bold text-slate-900">{modalTolak.nama}</span>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Alasan Penolakan (Wajib Diisi) *
              </label>
              <textarea
                value={alasanTolakBerkas}
                onChange={(e) => setAlasanTolakBerkas(e.target.value)}
                rows={4}
                placeholder="Contoh: Foto Akta Kelahiran buram / tidak terbaca jelas. Mohon unggah ulang foto yang jelas..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                required
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalTolak(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={konfirmasiTolak}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Konfirmasi Tolak Berkas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH STATUS SISWA */}
      {modalStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Ubah Status Siswa</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalStatus.nama} · sekarang{' '}
                  <span className="font-semibold text-slate-800">
                    {LABEL_STATUS_ANAK[modalStatus.status] || modalStatus.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => { setModalStatus(null); setGalatStatus(''); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status Baru</label>
              <select
                value={statusBaru}
                onChange={(e) => { setStatusBaru(e.target.value); setGalatStatus(''); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white cursor-pointer outline-none focus:border-[#095c51]"
              >
                <option value="AKTIF">Aktif (kembali bersekolah)</option>
                <option value="BERHENTI">Berhenti sekolah</option>
                <option value="PINDAH">Pindah sekolah</option>
                <option value="LULUS">Lulus</option>
                <option value="PENDAFTAR">Kembalikan ke Pendaftar</option>
              </select>
            </div>

            {PERLU_ALASAN.includes(statusBaru) && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alasan {statusBaru === 'PINDAH' ? 'Pindah' : 'Berhenti'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={alasanStatus}
                  onChange={(e) => { setAlasanStatus(e.target.value); setGalatStatus(''); }}
                  rows={3}
                  placeholder={statusBaru === 'PINDAH' ? 'Contoh: pindah domisili ke Bandung' : 'Contoh: alasan keluarga'}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    galatStatus ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-[#095c51]'
                  }`}
                />
              </div>
            )}

            {galatStatus && (
              <p role="alert" className="text-[11px] font-semibold text-rose-600 flex items-start gap-1">
                <span aria-hidden="true">⚠</span>
                <span>{galatStatus}</span>
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              Siswa berhenti atau pindah tidak lagi muncul di daftar siswa aktif, tetapi datanya tetap tersimpan di
              arsip dan bisa dikembalikan menjadi Aktif kapan saja.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setModalStatus(null); setGalatStatus(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={simpanStatus}
                className="px-4 py-2 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Simpan Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
