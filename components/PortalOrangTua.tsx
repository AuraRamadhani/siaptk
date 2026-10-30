'use client';

import React, { useState, useEffect } from "react";
import logoSIAPTK from "../app/assets/siap-tk-logo.png";

interface ParentViewProps {
    childrenData: any[];
    activeChildId: string;
    setActiveChildId: (id: string) => void;
    onRegisterClick: () => void;
    onLogout: () => void;
    role: string;
    setRole: (role: any) => void;
    setCurrentView: (view: any) => void;
}

export default function PortalOrangTua({
    activeChildId,
    setActiveChildId,
    onLogout,
    role,
    setRole
}: ParentViewProps) {
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [familyChildren, setFamilyChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // State untuk Modal Tambah Anak Baru & Berkas
    const [showAddChildModal, setShowAddChildModal] = useState<boolean>(false);
    const [modalStep, setModalStep] = useState<number>(1);
    const [namaAnak, setNamaAnak] = useState<string>("");
    const [tglLahirAnak, setTglLahirAnak] = useState<string>("");
    const [nikAnak, setNikAnak] = useState<string>("");
    const [jenisKelamin, setJenisKelamin] = useState<string>("Laki-laki");
    const [jalurPendaftaran, setJalurPendaftaran] = useState<string>("Daring");

    // State File Berkas Anak
    const [fileAkta, setFileAkta] = useState<File | null>(null);
    const [fileFoto, setFileFoto] = useState<File | null>(null);
    const [fileKia, setFileKia] = useState<File | null>(null);

    // State untuk Modal Bayar / Unggah Bukti Transfer Tagihan
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [selectedTagihan, setSelectedTagihan] = useState<string>("");
    const [buktiTransfer, setBuktiTransfer] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Ambil data asli secara otomatis dari database MySQL melalui API backend
    const fetchFamilyData = () => {
        fetch('/api/keluarga?email=keluarga.pratama@email.com')
            .then((res) => res.json())
            .then((result) => {
                if (result.success && result.data) {
                    const daftarAnak = result.data.anak || [];

                    const formattedChildren = daftarAnak.map((ch: any) => ({
                        id: String(ch.idAnak),
                        name: ch.nama,
                        group: ch.riwayatKelompok?.[0]?.kelompok?.nama || 'TK B',
                        birthDate: new Date(ch.tglLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                        status: ch.status === 'AKTIF' ? 'Aktif' : 'Pendaftar',
                        jalur: 'Daring',
                        sppStatus: 'Belum Dibayar',
                        savingsBalance: ch.tabunganBalance || 150000,
                        tagihan: ch.tagihan || [],
                        tabunganMutasi: ch.tabunganMutasi || [
                            { id: 1, ket: 'Setoran tunai via guru', tgl: '04 Okt 2026', nominal: 50000, status: 'Selesai' },
                            { id: 2, ket: 'Setoran awal pendaftaran', tgl: '28 Sep 2026', nominal: 100000, status: 'Selesai' }
                        ],
                        laporanMingguan: ch.laporanMingguan || [
                            {
                                tema: 'Makanan Sehat',
                                periode: 'Minggu 28 Sep 2026 · Guru: Bu Rina',
                                isi: 'Membawa bekal nasi, telur, dan pisang lalu dapat menyebutkan namanya. Sudah bisa membedakan makanan sehat dan tidak sehat. Mewarnai gambar wortel dengan rapi.',
                                dokumentasi: ['Mewarnai', 'Makan Bersama']
                            }
                        ]
                    }));

                    setFamilyChildren(formattedChildren);
                    if (formattedChildren.length > 0 && !activeChildId) {
                        setActiveChildId(formattedChildren[0].id);
                    }
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Gagal memuat data dari database:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchFamilyData();
    }, []);

    // Fungsi untuk mengirim data pendaftaran anak baru & berkas ke database via API (FormData)
    const handleSaveNewChild = async () => {
        if (!namaAnak || !tglLahirAnak || !nikAnak) {
            alert("Mohon lengkapi data utama anak (Nama, Tanggal Lahir, NIK)!");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('action', 'add_child');
            formData.append('email', 'keluarga.pratama@email.com');
            formData.append('namaAnak', namaAnak);
            formData.append('nikAnak', nikAnak);
            formData.append('tglLahirAnak', tglLahirAnak);
            formData.append('jenisKelamin', jenisKelamin);
            formData.append('jalurPendaftaran', jalurPendaftaran);

            if (fileAkta) formData.append('fileAkta', fileAkta);
            if (fileFoto) formData.append('fileFoto', fileFoto);
            if (fileKia) formData.append('fileKia', fileKia);

            const response = await fetch('/api/keluarga', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                alert("Berhasil mendaftarkan anak baru beserta berkas ke database!");
                setShowAddChildModal(false);
                setNamaAnak("");
                setTglLahirAnak("");
                setNikAnak("");
                setFileAkta(null);
                setFileFoto(null);
                setFileKia(null);
                setModalStep(1);
                fetchFamilyData();
            } else {
                alert(result.error || "Gagal menyimpan data anak.");
            }
        } catch (error) {
            console.error("Error submitting child:", error);
            alert("Terjadi kesalahan pada koneksi server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm font-bold">
                Memuat data dari database SIAP TK...
            </div>
        );
    }

    const activeChild = familyChildren.find(c => c.id === activeChildId) || familyChildren[0] || {
        name: 'Belum ada data',
        group: '-',
        savingsBalance: 0,
        tabunganMutasi: [],
        laporanMingguan: []
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col w-full relative">
            {/* Topbar Utama */}
            <header className="sticky top-0 z-40 bg-[#095c51] text-white shadow-md w-full">
                <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src={logoSIAPTK.src}
                            alt="Logo SIAP TK"
                            className="w-11 h-11 object-contain rounded-xl bg-white p-1 shadow-sm"
                        />
                        <div>
                            <span className="font-bold text-lg text-white tracking-wide">SIAP TK</span>
                            <p className="text-xs text-teal-200">TK Islam Nur Habib</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="bg-white text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] flex items-center justify-center text-[10px] font-bold">OR</span>
                            <span className="hidden sm:inline">Lihat sebagai</span>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="bg-transparent focus:outline-none cursor-pointer font-bold text-[#095c51]"
                            >
                                <option value="parent">Orang Tua (Keluarga Pratama)</option>
                                <option value="teacher">Guru</option>
                                <option value="treasurer">Bendahara</option>
                                <option value="principal">Kepala Sekolah</option>
                            </select>
                        </div>

                        <button
                            onClick={() => alert("Tidak ada pemberitahuan baru")}
                            className="w-10 h-10 rounded-xl bg-teal-800/80 hover:bg-teal-700 flex items-center justify-center text-white transition cursor-pointer relative shadow-xs"
                        >
                            🔔
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-400 rounded-full"></span>
                        </button>

                        <button
                            onClick={onLogout}
                            className="text-xs px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-bold shadow-sm"
                        >
                            Keluar
                        </button>
                    </div>
                </div>
            </header>

            {/* Layout Utama */}
            <div className="flex-1 flex w-full px-6 md:px-12 py-8 gap-8">
                {/* Sidebar Kiri */}
                <aside className="w-72 shrink-0 hidden md:flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-1.5 h-fit">
                    <div className="p-2 mb-2 border-b border-slate-100 pb-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
                            MENU PORTAL
                        </div>
                        <p className="text-[11px] text-slate-400">SIAP TK Nur Habib</p>
                    </div>

                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "overview" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Ringkasan</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("children")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "children" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Anak & Pendaftaran</span>
                        <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-[#095c51] rounded-full font-bold">
                            {familyChildren.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "payments" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Tagihan & Pembayaran</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("savings")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "savings" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Tabungan Siswa</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "reports" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Laporan Mingguan</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("family_files")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${activeTab === "family_files" ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <span>Berkas Keluarga</span>
                    </button>

                    {/* Footer Sidebar Card Keluarga */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-[#095c51] text-white flex items-center justify-center font-bold text-xs">
                                KP
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">Keluarga Pratama</div>
                                <div className="text-[10px] text-slate-500">{familyChildren.length} Anak Terdaftar</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Area Konten Utama Kanan */}
                <main className="flex-1 min-w-0 space-y-6">
                    {/* TAB: RINGKASAN */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Halo, Sari</h1>
                                    <p className="text-xs text-slate-500 mt-1">Pilih anak untuk melihat ringkasan perkembangan dan keuangannya dari database.</p>
                                </div>
                                <div className="flex space-x-2">
                                    {familyChildren.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeChildId === child.id
                                                    ? 'bg-[#095c51] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">SPP Bulan Ini</div>
                                    <div className="text-2xl font-bold text-slate-900 mt-1.5">Rp135.000</div>
                                    <span className="inline-block mt-3 px-2.5 py-1 text-[10px] bg-emerald-100 text-emerald-800 rounded-md font-bold">
                                        {activeChild?.sppStatus || 'Belum Dibayar'}
                                    </span>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">Saldo Tabungan Siswa</div>
                                    <div className="text-2xl font-bold text-slate-900 mt-1.5">
                                        Rp {Number(activeChild?.savingsBalance || 0).toLocaleString('ID-ID')}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1.5">Tanpa biaya administrasi</div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">Status Anak</div>
                                    <div className="text-2xl font-bold text-[#095c51] mt-1.5">Kelompok {activeChild?.group}</div>
                                    <div className="text-[11px] text-slate-400 mt-1.5">Tahun ajaran 2026/2027</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ANAK & PENDAFTARAN */}
                    {activeTab === "children" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Anak & Pendaftaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">Kelola data anak dan tambah pendaftaran siswa baru dalam satu akun keluarga.</p>
                                </div>
                                <button
                                    onClick={() => setShowAddChildModal(true)}
                                    className="px-5 py-3 bg-[#009688] hover:bg-[#00796b] text-white rounded-2xl font-bold text-xs transition shadow-sm flex items-center space-x-2 cursor-pointer"
                                >
                                    <span>+ Tambah Anak Baru</span>
                                </button>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/30">
                                            <th className="p-5">NAMA LENGKAP ANAK</th>
                                            <th className="p-5">TANGGAL LAHIR</th>
                                            <th className="p-5">KELOMPOK</th>
                                            <th className="p-5">JALUR</th>
                                            <th className="p-5">STATUS PENDAFTARAN</th>
                                            <th className="p-5 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {familyChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-slate-400">Belum ada anak terdaftar. Klik "+ Tambah Anak Baru" untuk mendaftar.</td>
                                            </tr>
                                        ) : (
                                            familyChildren.map((ch) => (
                                                <tr key={ch.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="p-5 font-bold text-slate-900">{ch.name}</td>
                                                    <td className="p-5 text-slate-500">{ch.birthDate}</td>
                                                    <td className="p-5">
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[10px]">
                                                            {ch.group}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-slate-600">{ch.jalur}</td>
                                                    <td className="p-5">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                                            {ch.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <button onClick={() => setActiveChildId(ch.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-[11px] transition cursor-pointer">
                                                            Pilih
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: TAGIHAN & PEMBAYARAN */}
                    {activeTab === "payments" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Tagihan & Pembayaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">Setiap anak memiliki tagihan sendiri. Bayar tagihan dan unduh kuitansi resmi sekolah.</p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="px-5 py-3 bg-[#009688] hover:bg-[#00796b] text-white rounded-2xl font-bold text-xs transition shadow-sm cursor-pointer flex items-center space-x-2"
                                >
                                    <span>💳 Bayar / Unggah Bukti</span>
                                </button>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                                            <th className="p-5">ANAK</th>
                                            <th className="p-5">TAGIHAN</th>
                                            <th className="p-5">NOMINAL</th>
                                            <th className="p-5">STATUS</th>
                                            <th className="p-5">METODE</th>
                                            <th className="p-5 text-right">KUITANSI / AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {familyChildren.flatMap(child => child.tagihan || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-slate-400">Belum ada data tagihan di database.</td>
                                            </tr>
                                        ) : (
                                            familyChildren.flatMap(child => (child.tagihan || []).map((t: any) => (
                                                <tr key={t.idTagihan} className="hover:bg-slate-50/50 transition">
                                                    <td className="p-5 font-bold text-slate-900">{child.name}</td>
                                                    <td className="p-5">{t.jenis}</td>
                                                    <td className="p-5 font-bold">Rp {Number(t.nominal).toLocaleString('ID-ID')}</td>
                                                    <td className="p-5">
                                                        <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${t.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                                                            }`}>
                                                            {t.status === 'LUNAS' ? 'Lunas' : 'Belum Dibayar'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-slate-500">{t.pembayaran?.[0]?.metode || '-'}</td>
                                                    <td className="p-5 text-right">
                                                        {t.status === 'LUNAS' ? (
                                                            <button onClick={() => alert("Mengunduh kuitansi...")} className="text-[#009688] font-semibold hover:underline cursor-pointer">
                                                                Kuitansi
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => setShowPaymentModal(true)} className="text-amber-600 font-bold hover:underline cursor-pointer">
                                                                Bayar Sekarang
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: TABUNGAN SISWA (Sesuai Referensi Gambar) */}
                    {activeTab === "savings" && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                                        <span>💰 Tabungan Siswa</span>
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-1">Pengelolaan saldo tabungan siswa transparan tanpa biaya administrasi.</p>
                                </div>
                                <div className="flex space-x-2">
                                    {familyChildren.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeChildId === child.id
                                                    ? 'bg-[#095c51] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Card Saldo Utama */}
                            <div className="bg-[#095c51] text-white p-8 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                                <div className="absolute right-6 top-6 bg-teal-800/80 px-3 py-1 rounded-xl text-xs font-bold tracking-wider">
                                    {activeChild.group}
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-teal-200 font-semibold">
                                        SALDO TABUNGAN · {activeChild.name.toUpperCase()}
                                    </div>
                                    <div className="text-4xl font-extrabold mt-2 tracking-tight">
                                        Rp {Number(activeChild.savingsBalance || 0).toLocaleString('ID-ID')}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-teal-700/60 flex items-center space-x-4">
                                    <button
                                        onClick={() => alert("Fitur Setor Tabungan dihubungkan ke Bendahara")}
                                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                                    >
                                        + Setor Tabungan
                                    </button>
                                    <button
                                        onClick={() => alert("Pengajuan penarikan dikirim ke pihak sekolah")}
                                        className="px-5 py-2.5 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-teal-600"
                                    >
                                        ↗ Ajukan Penarikan
                                    </button>
                                </div>
                            </div>

                            {/* Riwayat Mutasi Tabungan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-900">Riwayat Mutasi Tabungan</h2>
                                    <span className="text-xs text-slate-400 font-medium">{activeChild.tabunganMutasi?.length || 0} Transaksi</span>
                                </div>

                                <div className="space-y-3">
                                    {activeChild.tabunganMutasi?.map((mut: any) => (
                                        <div key={mut.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                                    ↙
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{mut.ket}</div>
                                                    <div className="text-[11px] text-slate-400">{mut.tgl}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-emerald-600">+ Rp {Number(mut.nominal).toLocaleString('ID-ID')}</div>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
                                                    {mut.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: LAPORAN MINGGUAN (Sesuai Referensi Gambar) */}
                    {activeTab === "reports" && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Laporan Mingguan Pembelajaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">Pantau perkembangan harian dan mingguan tematik siswa dari guru kelas.</p>
                                </div>
                                <div className="flex space-x-2">
                                    {familyChildren.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeChildId === child.id
                                                    ? 'bg-[#095c51] text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {activeChild.laporanMingguan?.map((lap: any, idx: number) => (
                                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-sm font-bold text-slate-900">Tema: {lap.tema}</h2>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{lap.periode}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-teal-100 text-[#095c51] rounded-xl text-xs font-bold">
                                                {activeChild.group} - {activeChild.name}
                                            </span>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                                            {lap.isi}
                                        </div>

                                        <div>
                                            <div className="text-xs font-bold text-slate-700 mb-2">Dokumentasi Kegiatan Minggu Ini</div>
                                            <div className="flex space-x-4">
                                                {lap.dokumentasi.map((doc: string, dIdx: number) => (
                                                    <div key={dIdx} className="w-28 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-1">
                                                        <span className="text-lg">🖼️</span>
                                                        <span className="text-[11px] font-semibold text-slate-600">{doc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: BERKAS KELUARGA (Sesuai Referensi Gambar) */}
                    {activeTab === "family_files" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs">
                                <h1 className="text-xl font-bold text-slate-900">Berkas Keluarga</h1>
                                <p className="text-xs text-slate-500 mt-1">KK dan KTP orang tua dipakai bersama oleh semua anak di akun ini.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-bold text-slate-900">Kartu Keluarga</h2>
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                            Terverifikasi
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">Saat ini: <span className="font-semibold text-slate-800">kk_pratama.jpg</span></p>
                                    <label className="block w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold text-center transition cursor-pointer shadow-xs">
                                        Unggah KK baru
                                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" />
                                    </label>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-bold text-slate-900">KTP Orang Tua</h2>
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                            Terverifikasi
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">Saat ini: <span className="font-semibold text-slate-800">ktp_ibu.jpg</span></p>
                                    <label className="block w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold text-center transition cursor-pointer shadow-xs">
                                        Unggah KTP baru
                                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MODAL KONFIRMASI PEMBAYARAN / UNGGAH BUKTI TRANSFER */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h2 className="text-base font-bold text-slate-900">Konfirmasi Pembayaran Tagihan</h2>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Kotak Info Rekening Sekolah */}
                        <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-1">
                            <div className="text-[11px] font-bold text-[#095c51] uppercase tracking-wider">
                                REKENING PEMBAYARAN SEKOLAH
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                                BSI 7123-4567-89 a/n TK Islam Nur Habib
                            </div>
                        </div>

                        {/* Pilih Tagihan */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Pilih Tagihan</label>
                            <select
                                value={selectedTagihan}
                                onChange={(e) => setSelectedTagihan(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-medium cursor-pointer"
                            >
                                <option value="">-- Pilih Tagihan Belum Lunas --</option>
                                {familyChildren.flatMap(child => (child.tagihan || []).filter((t: any) => t.status !== 'LUNAS').map((t: any) => (
                                    <option key={t.idTagihan} value={t.idTagihan}>
                                        {child.name} - {t.jenis} (Rp {Number(t.nominal).toLocaleString('ID-ID')})
                                    </option>
                                )))}
                            </select>
                        </div>

                        {/* Unggah Bukti Transfer */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Unggah Bukti Transfer</label>
                            <div className="p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition relative">
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => e.target.files && setBuktiTransfer(e.target.files[0])}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="text-xs font-medium text-slate-600">
                                    {buktiTransfer ? <span className="text-emerald-600 font-bold">{buktiTransfer.name}</span> : "Choose File No file chosen"}
                                </div>
                            </div>
                        </div>

                        {/* Tombol Aksi Modal */}
                        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    alert("Bukti pembayaran berhasil dikirim! Menunggu verifikasi bendahara.");
                                    setShowPaymentModal(false);
                                    setBuktiTransfer(null);
                                }}
                                className="px-6 py-2.5 bg-[#009688] hover:bg-[#00796b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition"
                            >
                                Kirim Bukti Pembayaran
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH ANAK BARU (PPDB) */}
            {showAddChildModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Formulir Pendaftaran Anak Baru</h2>
                                <p className="text-xs text-slate-400">Lengkapi data anak, berkas, dan jalur kedatangan.</p>
                            </div>
                            <button
                                onClick={() => setShowAddChildModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
                            <div className={`flex items-center space-x-2 text-xs font-bold ${modalStep === 1 ? 'text-[#095c51]' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${modalStep === 1 ? 'bg-teal-100 text-[#095c51]' : 'bg-slate-100'}`}>1</span>
                                <span>Data Anak</span>
                            </div>
                            <div className={`flex items-center space-x-2 text-xs font-bold ${modalStep === 2 ? 'text-[#095c51]' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${modalStep === 2 ? 'bg-teal-100 text-[#095c51]' : 'bg-slate-100'}`}>2</span>
                                <span>Berkas Anak</span>
                            </div>
                            <div className={`flex items-center space-x-2 text-xs font-bold ${modalStep === 3 ? 'text-[#095c51]' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${modalStep === 3 ? 'bg-teal-100 text-[#095c51]' : 'bg-slate-100'}`}>3</span>
                                <span>Jalur PPDB</span>
                            </div>
                        </div>

                        {modalStep === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap Calon Siswa *</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Muhammad Ali Pratama"
                                        value={namaAnak}
                                        onChange={(e) => setNamaAnak(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Lahir *</label>
                                        <input
                                            type="date"
                                            value={tglLahirAnak}
                                            onChange={(e) => setTglLahirAnak(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Kelamin</label>
                                        <select
                                            value={jenisKelamin}
                                            onChange={(e) => setJenisKelamin(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white cursor-pointer"
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">NIK (Sesuai Kartu Keluarga) *</label>
                                    <input
                                        type="text"
                                        placeholder="36710xxxxxxxxxxx"
                                        value={nikAnak}
                                        onChange={(e) => setNikAnak(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                    />
                                </div>
                            </div>
                        )}

                        {modalStep === 2 && (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
                                    <span className="text-amber-600 text-base font-bold">⚠️</span>
                                    <p className="text-xs text-amber-800 font-medium">
                                        Berkas khusus anak dapat diunggah sekarang atau disusulkan nanti sebelum masa orientasi dimulai.
                                    </p>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#095c51] flex items-center justify-center font-bold">📄</div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">Fotokopi Akta Kelahiran</div>
                                            <div className="text-[11px] text-slate-400">
                                                {fileAkta ? <span className="text-emerald-600 font-semibold">{fileAkta.name}</span> : "Format PDF/JPG, maks 2 MB"}
                                            </div>
                                        </div>
                                    </div>
                                    <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                        Pilih File
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files && setFileAkta(e.target.files[0])} />
                                    </label>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">🖼️</div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">Pas Foto Anak (3x4)</div>
                                            <div className="text-[11px] text-slate-400">
                                                {fileFoto ? <span className="text-emerald-600 font-semibold">{fileFoto.name}</span> : "Foto berlatar belakang merah/biru"}
                                            </div>
                                        </div>
                                    </div>
                                    <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                        Pilih File
                                        <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => e.target.files && setFileFoto(e.target.files[0])} />
                                    </label>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">🪪</div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">Kartu Identitas Anak (KIA) / Opsional</div>
                                            <div className="text-[11px] text-slate-400">
                                                {fileKia ? <span className="text-emerald-600 font-semibold">{fileKia.name}</span> : "Jika sudah memiliki KIA"}
                                            </div>
                                        </div>
                                    </div>
                                    <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                        Pilih File
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files && setFileKia(e.target.files[0])} />
                                    </label>
                                </div>
                            </div>
                        )}

                        {modalStep === 3 && (
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-700">Pilih Metode Pendaftaran</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setJalurPendaftaran("Daring")}
                                        className={`p-4 rounded-2xl border cursor-pointer transition ${jalurPendaftaran === 'Daring' ? 'border-[#095c51] bg-teal-50/50 ring-2 ring-[#095c51]/20' : 'border-slate-200'}`}
                                    >
                                        <div className="text-xs font-bold text-slate-900">100% Daring (Online)</div>
                                        <p className="text-[11px] text-slate-500 mt-1">Verifikasi berkas & pembayaran dilakukan sepenuhnya melalui website.</p>
                                    </div>
                                    <div
                                        onClick={() => setJalurPendaftaran("Onsite")}
                                        className={`p-4 rounded-2xl border cursor-pointer transition ${jalurPendaftaran === 'Onsite' ? 'border-[#095c51] bg-teal-50/50 ring-2 ring-[#095c51]/20' : 'border-slate-200'}`}
                                    >
                                        <div className="text-xs font-bold text-slate-900">Datang Langsung (Onsite)</div>
                                        <p className="text-[11px] text-slate-500 mt-1">Pilih slot kedatangan ke sekretariat sekolah untuk penyerahan berkas fisik.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            {modalStep > 1 ? (
                                <button onClick={() => setModalStep(modalStep - 1)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
                                    Kembali
                                </button>
                            ) : <div />}

                            {modalStep < 3 ? (
                                <button onClick={() => setModalStep(modalStep + 1)} className="px-6 py-2.5 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm">
                                    Lanjut
                                </button>
                            ) : (
                                <button onClick={handleSaveNewChild} disabled={isSubmitting} className="px-6 py-2.5 bg-[#009688] hover:bg-[#00796b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm">
                                    {isSubmitting ? "Menyimpan..." : "Kirim Pendaftaran"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}