// src/components/LoginRegister.tsx
'use client';

import React from 'react';
import logoSIAPTK from '@/app/assets/siap-tk-logo.png';

interface LoginRegisterProps {
    authMode: 'login' | 'register';
    setAuthMode: (mode: 'login' | 'register') => void;
    inputEmail: string;
    setInputEmail: (val: string) => void;
    inputPassword: string;
    setInputPassword: (val: string) => void;
    inputName: string;
    setInputName: (val: string) => void;
    handleLoginSubmit: (e: React.FormEvent) => void;
    handleRegisterSubmit: (e: React.FormEvent) => void;
    onGoToPublicInfo: () => void;
    onLoginTeacher: () => void;
    // Opsional: dipakai saat layar login dipisah per peran.
    peranJudul?: string;
    galat?: string;
    memuat?: boolean;
    tanpaDaftar?: boolean;
    labelAksiKedua?: string;
        tautanPeran?: { label: string; href: string }[];
    }

export default function LoginRegister({
    authMode,
    setAuthMode,
    inputEmail,
    setInputEmail,
    inputPassword,
    setInputPassword,
    inputName,
    setInputName,
    handleLoginSubmit,
    handleRegisterSubmit,
    onGoToPublicInfo,
        onLoginTeacher,
        peranJudul,
        galat,
        memuat,
        tanpaDaftar,
        labelAksiKedua,
                tautanPeran,
            }: LoginRegisterProps) {
    return (
        <main className="min-h-screen w-full flex flex-col md:flex-row font-sans antialiased">
            {/* Kolom Kiri (Hijau Tua) - Ukuran Sedang */}
            <div className="md:w-1/2 bg-[#095c51] text-white p-12 md:p-20 flex flex-col justify-between">
                <div>
                    <div className="flex items-center space-x-3.5 mb-12">
                        <img
                            src={logoSIAPTK.src}
                            alt="Logo SIAP TK"
                            className="w-12 h-12 object-contain rounded-2xl bg-white p-1 shadow-md"
                        />
                        <div>
                            <h1 className="font-bold text-base tracking-wide text-white">SIAP TK</h1>
                            <p className="text-xs text-teal-200">TK Islam Nur Habib</p>
                        </div>
                    </div>

                    <div className="inline-flex items-center space-x-2 bg-teal-800/60 border border-teal-600/50 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 text-teal-100">
                        <span className="text-amber-400">✨</span>
                        <span>Sistem Informasi Administrasi & PPDB</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                        Selamat Datang di <br />
                        SIAP TK! <span className="inline-block animate-bounce">👋</span>
                    </h2>

                    <p className="text-sm md:text-base text-teal-100/90 leading-relaxed max-w-xl">
                        Platform layanan administrasi sekolah, pendaftaran murid baru (PPDB), laporan pembelajaran mingguan, dan tabungan siswa TK Islam Nur Habib.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-10">
                    <button
                        onClick={onGoToPublicInfo}
                        className="px-7 py-4 bg-[#fbbf24] text-slate-900 rounded-xl font-bold text-xs md:text-sm hover:bg-[#f59e0b] transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        <span>Lihat Info Publik & Biaya</span>
                        <span>→</span>
                    </button>
                    <button
                        onClick={onLoginTeacher}
                        className="px-7 py-4 bg-teal-900/40 border border-teal-600/60 text-white rounded-xl font-bold text-xs md:text-sm hover:bg-teal-800 transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        <span>{labelAksiKedua ?? '👤 Masuk Portal Guru'}</span>
                    </button>
                </div>

                <div className="text-xs text-teal-300/70 pt-8">
                    © 2026 SIAP TK - TK Islam Nur Habib.
                </div>
            </div>

            {/* Kolom Kanan (Putih / Form Login & Register) - Proporsional */}
            <div className="md:w-1/2 bg-white p-12 md:p-20 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <img
                            src={logoSIAPTK.src}
                            alt="Logo SIAP TK"
                            className="w-9 h-9 object-contain rounded-xl bg-slate-100 p-0.5 border border-slate-200"
                        />
                        <span className="font-bold text-sm text-[#095c51]">SIAP TK</span>
                    </div>

                    <button
                        onClick={onGoToPublicInfo}
                        className="text-xs md:text-sm font-semibold text-slate-500 hover:text-[#095c51] transition cursor-pointer"
                    >
                        ⊙ Syarat & Biaya
                    </button>
                </div>

                {/* Kotak Form Ukuran Sedang & Nyaman Dilihat */}
                <div className="max-w-md w-full mx-auto my-auto py-8">
                    {galat && (
                        <div className="mb-4 text-xs md:text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                            {galat}
                        </div>
                    )}
                    <div className="mb-8">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                            {peranJudul
                                ? `Masuk Portal ${peranJudul}`
                                : authMode === 'login'
                                ? 'Selamat Datang Kembali!'
                                : 'Daftar Akun Keluarga Baru'}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 mt-2">
                            {peranJudul
                                ? `Gunakan email dan kata sandi ${peranJudul.toLowerCase()} untuk mengakses portal.`
                                : authMode === 'login'
                                ? 'Masuk dengan akun keluarga Anda untuk mengakses portal siswa.'
                                : 'Lengkapi data untuk mendaftarkan akun keluarga di SIAP TK.'}
                        </p>
                    </div>

                    {authMode === 'login' ? (
                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Email atau Nomor WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-sm">✉</span>
                                    <input
                                        type="text"
                                        value={inputEmail}
                                        onChange={(e) => setInputEmail(e.target.value)}
                                        placeholder="sari.pratama@gmail.com"
                                        className="w-full pl-11 pr-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700">Kata Sandi</label>
                                    <button
                                        type="button"
                                        onClick={() => alert("Fitur pemulihan kata sandi")}
                                        className="text-xs md:text-sm text-[#095c51] font-semibold hover:underline"
                                    >
                                        Lupa kata sandi?
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-sm">🔒</span>
                                    <input
                                        type="password"
                                        value={inputPassword}
                                        onChange={(e) => setInputPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={memuat}
                                className="w-full py-4 bg-[#095c51] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#074840] transition cursor-pointer shadow-md mt-3 disabled:opacity-60"
                            >
                                {memuat ? 'Memproses...' : 'Masuk Sekarang'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegisterSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Nama Lengkap Orang Tua</label>
                                <input
                                    type="text"
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                    placeholder="cth: Sari Pratama"
                                    className="w-full px-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Email / WhatsApp</label>
                                <input
                                    type="text"
                                    value={inputEmail}
                                    onChange={(e) => setInputEmail(e.target.value)}
                                    placeholder="cth: sari@gmail.com"
                                    className="w-full px-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Buat Kata Sandi</label>
                                <input
                                    type="password"
                                    value={inputPassword}
                                    onChange={(e) => setInputPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-[#095c51] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#074840] transition cursor-pointer shadow-md mt-3"
                            >
                                Daftar Akun Keluarga
                            </button>
                        </form>
                    )}

                    {!tanpaDaftar && (
                        <div className="mt-8 text-center border-t border-slate-100 pt-6">
                            {authMode === 'login' ? (
                                <div>
                                    <span className="text-xs md:text-sm text-slate-500">Belum memiliki akun keluarga? </span>
                                    <button
                                        onClick={() => setAuthMode('register')}
                                        className="text-xs md:text-sm font-bold text-slate-800 hover:underline ml-1 cursor-pointer"
                                    >
                                        Daftar di sini
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-xs md:text-sm text-slate-500">Sudah punya akun keluarga? </span>
                                    <button
                                        onClick={() => setAuthMode('login')}
                                        className="text-xs md:text-sm font-bold text-[#095c51] hover:underline ml-1 cursor-pointer"
                                    >
                                        Masuk di sini
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                {tautanPeran && tautanPeran.length > 0 && (
                                        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] md:text-xs">
                                            <span className="text-slate-400">Portal lain:</span>
                                            {tautanPeran.map((t) => (
                                                <a key={t.href} href={t.href} className="font-semibold text-[#095c51] hover:underline">
                                                    {t.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div></div>
            </div>
        </main>
    );
}