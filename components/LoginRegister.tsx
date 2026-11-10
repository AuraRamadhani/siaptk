'use client';

import React, { useState } from 'react';
import { Hand, ArrowRight, Eye, EyeOff, X, Check, Info } from 'lucide-react';
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
    onPilihPortal: (slug: string) => void;
    // Opsional: dipakai saat layar login dipisah per peran.
    peranSlug?: string;
    peranJudul?: string;
    peranKode?: string;
    galat?: string;
    memuat?: boolean;
    tanpaDaftar?: boolean;
    daftarPortal?: { label: string; slug: string }[];
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
    onPilihPortal,
    peranSlug = 'orang-tua',
    peranJudul,
    peranKode = 'ORANG_TUA',
    galat,
    memuat,
    tanpaDaftar,
    daftarPortal = [],
}: LoginRegisterProps) {
    // Visibilitas kata sandi di form login & daftar
    const [showPassword, setShowPassword] = useState(false);

    // State untuk Lupa Kata Sandi / Buat Kata Sandi Ulang
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState<'verify' | 'new_password' | 'done'>('verify');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotVerifikasi, setForgotVerifikasi] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
    const [verifiedName, setVerifiedName] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');

    const bukaModalReset = () => {
        setForgotEmail(inputEmail);
        setForgotVerifikasi('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowNewPass(false);
        setShowConfirmNewPass(false);
        setVerifiedName('');
        setForgotError('');
        setResetStep('verify');
        setShowForgotPassword(true);
    };

    const tutupModalReset = () => {
        setShowForgotPassword(false);
        setForgotError('');
    };

    const handleVerifyReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peran: peranKode,
                    email: forgotEmail,
                    verifikasi: forgotVerifikasi,
                    aksi: 'cek',
                }),
            });
            const result = await res.json();
            if (result.success) {
                setVerifiedName(result.data?.nama || '');
                setResetStep('new_password');
            } else {
                setForgotError(result.error || 'Data tidak cocok.');
            }
        } catch {
            setForgotError('Terjadi kesalahan pada server.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSaveNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');

        if (newPassword.length < 6) {
            setForgotError('Kata sandi baru minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setForgotError('Konfirmasi kata sandi tidak cocok.');
            return;
        }

        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peran: peranKode,
                    email: forgotEmail,
                    verifikasi: forgotVerifikasi,
                    aksi: 'reset',
                    kataSandiBaru: newPassword,
                }),
            });
            const result = await res.json();
            if (result.success) {
                setInputEmail(forgotEmail);
                setInputPassword('');
                setResetStep('done');
            } else {
                setForgotError(result.error || 'Gagal memperbarui kata sandi.');
            }
        } catch {
            setForgotError('Terjadi kesalahan pada server.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <>
            <main className="min-h-screen w-full flex flex-col md:flex-row font-sans antialiased">
                {/* Kolom Kiri (Hijau Tua) */}
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

                        <div className="inline-flex items-center bg-teal-800/60 border border-teal-600/50 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 text-teal-100">
                            <span>Sistem Informasi Administrasi &amp; PPDB</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            Selamat Datang di <br />
                            <span className="inline-flex items-center gap-3">
                                <span>SIAP TK!</span>
                                <Hand className="w-8 h-8 text-amber-300 animate-bounce" strokeWidth={2} />
                            </span>
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
                            <span>Lihat Info Publik &amp; Biaya</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="text-xs text-teal-300/70 pt-8">
                        © 2026 SIAP TK - TK Islam Nur Habib.
                    </div>
                </div>

                {/* Kolom Kanan (Putih / Form Login & Register) */}
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
                            className="text-xs md:text-sm font-semibold text-slate-500 hover:text-[#095c51] transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                            <Info className="w-4 h-4" />
                            <span>Syarat &amp; Biaya</span>
                        </button>
                    </div>

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
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Email atau Nomor WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={inputEmail}
                                        onChange={(e) => setInputEmail(e.target.value)}
                                        placeholder="nama@email.com"
                                        className="w-full px-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs md:text-sm font-semibold text-slate-700">
                                            Kata Sandi
                                        </label>
                                        <button
                                            type="button"
                                            onClick={bukaModalReset}
                                            className="text-xs md:text-sm text-[#095c51] font-semibold hover:underline cursor-pointer"
                                        >
                                            Lupa kata sandi?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={inputPassword}
                                            onChange={(e) => setInputPassword(e.target.value)}
                                            placeholder="Masukkan kata sandi"
                                            className="w-full pl-4 pr-12 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-[#095c51] transition cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
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
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Nama Lengkap Orang Tua
                                    </label>
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
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Email / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={inputEmail}
                                        onChange={(e) => setInputEmail(e.target.value)}
                                        placeholder="cth: nama@email.com"
                                        className="w-full px-4 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Buat Kata Sandi
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={inputPassword}
                                            onChange={(e) => setInputPassword(e.target.value)}
                                            placeholder="Minimal 6 karakter"
                                            className="w-full pl-4 pr-12 py-3.5 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-[#095c51] transition cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
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

                        {daftarPortal.length > 0 && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs">
                                <label htmlFor="pilih-portal-select" className="text-slate-500 font-medium">
                                    Masuk Portal:
                                </label>
                                <select
                                    id="pilih-portal-select"
                                    value={peranSlug}
                                    onChange={(e) => onPilihPortal(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-[#095c51] focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 cursor-pointer"
                                >
                                    {daftarPortal.map((p) => (
                                        <option key={p.slug} value={p.slug}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div />
                </div>
            </main>

            {/* MODAL LUPA KATA SANDI / BUAT KATA SANDI ULANG */}
            {showForgotPassword && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    {resetStep === 'done' ? 'Kata Sandi Diperbarui' : 'Buat Kata Sandi Ulang'}
                                </h2>
                                {resetStep !== 'done' && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {resetStep === 'verify'
                                            ? 'Verifikasi identitas akun Anda terlebih dahulu.'
                                            : `Buat kata sandi baru untuk akun ${verifiedName || forgotEmail}.`}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={tutupModalReset}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {resetStep === 'verify' && (
                            <form onSubmit={handleVerifyReset} className="space-y-4">
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Email Terdaftar
                                    </label>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="Masukkan email terdaftar"
                                        className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        {peranKode === 'ORANG_TUA'
                                            ? 'Nomor WhatsApp Terdaftar'
                                            : 'Nama Lengkap Terdaftar'}
                                    </label>
                                    <input
                                        type="text"
                                        value={forgotVerifikasi}
                                        onChange={(e) => setForgotVerifikasi(e.target.value)}
                                        placeholder={
                                            peranKode === 'ORANG_TUA'
                                                ? 'cth: 0812xxxxxxxx'
                                                : 'cth: Budi Santoso, S.Pd.'
                                        }
                                        className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                        required
                                    />
                                </div>

                                {forgotError && (
                                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                                        {forgotError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="w-full py-3.5 bg-[#095c51] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#074840] transition cursor-pointer shadow-md disabled:opacity-60"
                                >
                                    {forgotLoading ? 'Memverifikasi...' : 'Lanjut Buat Kata Sandi Baru'}
                                </button>

                                <button
                                    type="button"
                                    onClick={tutupModalReset}
                                    className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition"
                                >
                                    Batal
                                </button>
                            </form>
                        )}

                        {resetStep === 'new_password' && (
                            <form onSubmit={handleSaveNewPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Kata Sandi Baru
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPass ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimal 6 karakter"
                                            className="w-full pl-4 pr-12 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPass(!showNewPass)}
                                            aria-label={showNewPass ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-[#095c51] transition cursor-pointer"
                                        >
                                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">
                                        Konfirmasi Kata Sandi Baru
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmNewPass ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            placeholder="Ulangi kata sandi baru"
                                            className="w-full pl-4 pr-12 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                                            aria-label={showConfirmNewPass ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-[#095c51] transition cursor-pointer"
                                        >
                                            {showConfirmNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {forgotError && (
                                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                                        {forgotError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="w-full py-3.5 bg-[#095c51] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#074840] transition cursor-pointer shadow-md disabled:opacity-60"
                                >
                                    {forgotLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetStep('verify');
                                        setForgotError('');
                                    }}
                                    className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition"
                                >
                                    Kembali
                                </button>
                            </form>
                        )}

                        {resetStep === 'done' && (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Kata Sandi Berhasil Diubah</h3>
                                <p className="text-sm text-slate-600">
                                    Kata sandi untuk <strong>{forgotEmail}</strong> sudah diperbarui. Silakan masuk menggunakan kata sandi baru Anda.
                                </p>
                                <button
                                    onClick={tutupModalReset}
                                    className="w-full py-3 bg-[#095c51] text-white rounded-xl text-sm font-bold hover:bg-[#074840] transition cursor-pointer"
                                >
                                    Kembali ke Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
