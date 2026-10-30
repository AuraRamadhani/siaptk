// src/components/InfoPublik.tsx
'use client';

import React, { useState, useEffect } from 'react';
import logoSIAPTK from '@/app/assets/siap-tk-logo.png';

interface InfoPublikProps {
    onBackToLogin: () => void;
    onGoToRegister: () => void;
    childBirthDate: string;
    setChildBirthDate: (date: string) => void;
    calculatedGroup: string | null;
    handleCheckGroup: (date: string) => void;
}

export default function InfoPublik({
    onBackToLogin,
    onGoToRegister,
    childBirthDate,
    setChildBirthDate,
    calculatedGroup,
    handleCheckGroup,
}: InfoPublikProps) {
    const [biayaList, setBiayaList] = useState<any[]>([]);
    const [loadingBiaya, setLoadingBiaya] = useState<boolean>(true);

    // Mengambil data rincian biaya secara dinamis dari database/API backend
    useEffect(() => {
        fetch('/api/biaya') // Sesuaikan endpoint API backend Anda jika ada
            .then((res) => res.json())
            .then((result) => {
                if (result.success && result.data) {
                    setBiayaList(result.data);
                } else {
                    // Fallback data default jika API belum aktif
                    setBiayaList([
                        { komponen: 'Formulir pendaftaran', nominal: 70000 },
                        { komponen: 'Seragam 4 stel, media belajar, dll.', nominal: 1500000 },
                        { komponen: 'SPP per anak per bulan', nominal: 135000 },
                    ]);
                }
                setLoadingBiaya(false);
            })
            .catch(() => {
                // Fallback offline / static data jika fetch gagal
                setBiayaList([
                    { komponen: 'Formulir pendaftaran', nominal: 70000 },
                    { komponen: 'Seragam 4 stel, media belajar, dll.', nominal: 1500000 },
                    { komponen: 'SPP per anak per bulan', nominal: 135000 },
                ]);
                setLoadingBiaya(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased flex flex-col">
            {/* Navbar Atas */}
            <header className="bg-[#095c51] text-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src={logoSIAPTK.src}
                            alt="Logo SIAP TK"
                            className="w-10 h-10 object-contain rounded-xl bg-white p-1"
                        />
                        <div>
                            <span className="font-bold text-lg text-white tracking-wide">SIAP TK</span>
                            <p className="text-xs text-teal-200">TK Islam Nur Habib - Pusat Informasi PPDB</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onBackToLogin}
                            className="px-5 py-2.5 bg-teal-800/80 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-teal-600"
                        >
                            Masuk
                        </button>
                        <button
                            onClick={onGoToRegister}
                            className="px-5 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                        >
                            Daftar Sekarang
                        </button>
                    </div>
                </div>
            </header>

            {/* Konten Utama Info Publik */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 w-full">
                {/* Hero Banner PPDB */}
                <div className="bg-[#095c51] rounded-3xl p-8 md:p-12 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <span className="inline-block px-3 py-1 bg-teal-800/80 border border-teal-600 text-teal-100 rounded-full text-xs font-semibold">
                            Tahun Ajaran 2026/2027
                        </span>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                            Informasi PPDB & Syarat Pendaftaran
                        </h1>
                        <p className="text-xs md:text-sm text-teal-100 leading-relaxed">
                            Pendaftaran Peserta Didik Baru TK Islam Nur Habib terintegrasi langsung dengan database sekolah. Sistem satu akun keluarga memudahkan pendaftaran kakak-adik dalam satu portal.
                        </p>
                    </div>
                    <button
                        onClick={onGoToRegister}
                        className="px-6 py-3.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 rounded-xl font-bold text-xs transition shadow-md shrink-0 cursor-pointer"
                    >
                        Daftar Akun Keluarga Sekarang
                    </button>
                </div>

                {/* Cek Kelompok Anak */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#095c51] text-white flex items-center justify-center font-bold text-xs">✨</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Cek kelompok anak Anda</h3>
                            <p className="text-xs text-slate-500">Masukkan tanggal lahir anak untuk mengecek kelompoknya secara otomatis berdasarkan aturan sistem.</p>
                        </div>
                    </div>
                    <div className="max-w-md flex flex-col sm:flex-row gap-3 pt-2">
                        <input
                            type="date"
                            value={childBirthDate}
                            onChange={(e) => handleCheckGroup(e.target.value)}
                            className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50"
                        />
                    </div>
                    {calculatedGroup && (
                        <div className="p-3 bg-teal-50 border border-teal-200 text-[#095c51] rounded-xl text-xs font-bold mt-2">
                            Hasil Sistem: {calculatedGroup}
                        </div>
                    )}
                </div>

                {/* Kartu Kelompok Usia */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Kelompok ditentukan dari usia anak</h3>
                        <p className="text-xs text-slate-500">Usia dihitung per 1 Juli 2026 sesuai database akademik.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">KB</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Kelompok Bermain</h4>
                                <p className="text-xs text-slate-400 mt-0.5">3-4 tahun</p>
                            </div>
                            <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center space-x-2">
                                <span>📅</span>
                                <span>Senin, Rabu, Jumat 08.00 - 10.00</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="w-10 h-10 rounded-full bg-teal-100 text-[#095c51] flex items-center justify-center font-bold text-xs">A</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">TK A</h4>
                                <p className="text-xs text-slate-400 mt-0.5">4-5 tahun</p>
                            </div>
                            <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center space-x-2">
                                <span>📅</span>
                                <span>Senin - Kamis 08.00 - 11.00, Jumat 08.00 - 10.00</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">B</div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">TK B</h4>
                                <p className="text-xs text-slate-400 mt-0.5">5-6 tahun</p>
                            </div>
                            <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center space-x-2">
                                <span>📅</span>
                                <span>Senin - Kamis 08.00 - 11.00, Jumat 08.00 - 10.00</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Syarat Pendaftaran */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-[#095c51] flex items-center justify-center font-bold text-xs">📋</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Syarat Pendaftaran</h3>
                            <p className="text-xs text-slate-500">Persyaratan resmi calon peserta didik TK Islam Nur Habib</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                                <span className="text-slate-700">Mengisi formulir pendaftaran akun keluarga.</span>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                                <span className="text-slate-700">Beragama Islam.</span>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                                <span className="text-slate-700">Sehat jasmani dan rohani.</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                                <span className="text-slate-700"><b>Berkas anak:</b> fotokopi akta kelahiran, fotokopi KIA, pas foto 3x4 (2 lembar).</span>
                            </div>
                            <div className="flex items-start space-x-3">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-[#095c51] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
                                <span className="text-slate-700"><b>Berkas keluarga:</b> fotokopi KK dan KTP orang tua. Cukup diunggah sekali untuk semua anak dalam satu database keluarga.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rincian Biaya */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">💳</div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Rincian Biaya</h3>
                            <p className="text-xs text-slate-500">Transparan tanpa biaya tersembunyi</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                                    <th className="pb-3">KOMPONEN BIAYA</th>
                                    <th className="pb-3 text-right">NOMINAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {loadingBiaya ? (
                                    <tr>
                                        <td colSpan={2} className="py-4 text-center text-slate-400">Memuat data biaya dari database...</td>
                                    </tr>
                                ) : (
                                    biayaList.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 font-medium">{item.komponen}</td>
                                            <td className="py-3 text-right font-bold text-slate-900">
                                                Rp {item.nominal.toLocaleString('ID-ID')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3 text-xs">
                        <div className="font-bold text-amber-900 flex items-center space-x-2">
                            <span>✨</span>
                            <span>Potongan Pendaftaran Periode Gelombang:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
                            <li>Desember – Februari: Diskon 30%</li>
                            <li>Maret – April: Diskon 20%</li>
                            <li>Mei – Juni: Diskon 10%</li>
                        </ul>
                        <p className="text-amber-900 font-semibold pt-1 border-t border-amber-200/60">
                            Total estimasi biaya pendaftaran awal standar sebesar <b>Rp1.570.000</b>.
                        </p>
                    </div>
                </div>

                {/* Footer Hubungi Kami */}
                <div className="bg-[#095c51] rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold tracking-wider text-teal-200 uppercase">HUBUNGI KAMI</span>
                        <h3 className="text-xl font-extrabold">Sekretariat TK Islam Nur Habib</h3>
                        <p className="text-xs text-teal-100 flex items-center space-x-2">
                            <span>📍</span>
                            <span>Jl. KS. Tubun RT 03/04, Kel. Pasar Baru, Kec. Karawaci, Kota Tangerang</span>
                        </p>
                        <p className="text-xs text-teal-100 flex items-center space-x-2">
                            <span>📞</span>
                            <span>Bunda Anis · 0812 3424 7277</span>
                        </p>
                    </div>
                    <button
                        onClick={onGoToRegister}
                        className="px-6 py-3.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 rounded-xl font-bold text-xs transition shadow-md shrink-0 cursor-pointer"
                    >
                        Buat Akun & Daftar
                    </button>
                </div>
            </div>
        </div>
    );
}