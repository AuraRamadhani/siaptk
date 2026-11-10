// src/components/RegisterKeluarga.tsx
'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

import React, { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Eye, EyeOff, Folder, Upload } from 'lucide-react';
import logoSIAPTK from '@/app/assets/siap-tk-logo.png';
import { useToast } from '@/components/Toast';

interface RegisterKeluargaProps {
    onBackToLogin: () => void;
    onSuccessRegister: () => void;
}

export default function RegisterKeluarga({
    onBackToLogin,
    onSuccessRegister,
}: RegisterKeluargaProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        namaAyah: '',
        namaIbu: '',
        pekerjaanAyah: '',
        pekerjaanIbu: '',
        noWhatsapp: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [fileKK, setFileKK] = useState<File | null>(null);
    const [fileKTP, setFileKTP] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Status visibilitas kata sandi (mode terlihat / tersembunyi)
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    const kkInputRef = useRef<HTMLInputElement>(null);
    const ktpInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.namaAyah || !formData.namaIbu || !formData.email || !formData.password || !formData.noWhatsapp) {
            toast.warning("Mohon lengkapi data wajib yang bertanda bintang (*)");
            return;
        }

        if (formData.password.length < 6) {
            toast.warning("Kata sandi minimal 6 karakter!");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Kata sandi dan konfirmasi kata sandi tidak cocok!");
            return;
        }

        if (!fileKK || !fileKTP) {
            toast.warning("Semua berkas keluarga wajib diisi: Kartu Keluarga (KK) dan KTP Orang Tua / Wali!");
            return;
        }

        setLoading(true);

        try {
            const dataToSend = new FormData();
            dataToSend.append('action', 'register_keluarga');
            dataToSend.append('namaAyah', formData.namaAyah);
            dataToSend.append('namaIbu', formData.namaIbu);
            dataToSend.append('pekerjaanAyah', formData.pekerjaanAyah);
            dataToSend.append('pekerjaanIbu', formData.pekerjaanIbu);
            dataToSend.append('noHp', formData.noWhatsapp);
            dataToSend.append('email', formData.email);
            dataToSend.append('password', formData.password);

            if (fileKK) {
                dataToSend.append('fileKK', fileKK);
            }
            if (fileKTP) {
                dataToSend.append('fileKTP', fileKTP);
            }

            const response = await fetch('/api/auth', {
                method: 'POST',
                body: dataToSend,
            });

            const contentType = response.headers.get("content-type");
            let result;

            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                // Jika server merespons dengan HTML atau teks biasa (misalnya halaman error 409/500)
                const textResponse = await response.text();
                console.error("Non-JSON Response:", textResponse);

                if (response.status === 409) {
                    throw new Error("Email atau nomor WhatsApp sudah terdaftar di database.");
                } else {
                    throw new Error(`Server mengembalikan respons non-JSON (Status: ${response.status})`);
                }
            }

            if (!response.ok) {
                throw new Error(result.error || result.message || "Gagal mendaftarkan akun ke database.");
            }

            if (result.success) {
                toast.success("Akun keluarga berhasil didaftarkan dan disimpan ke database! Silakan masuk.");
                onSuccessRegister();
            } else {
                toast.error(result.error || "Gagal mendaftarkan akun ke database.");
            }
        } catch (error: any) {
            console.error("Registrasi Error:", error);
            toast.error("Terjadi kesalahan: " + (error.message || "Gagal terhubung ke server database."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased py-10 px-4 flex flex-col items-center">
            <div className="max-w-4xl w-full flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <img
                        src={logoSIAPTK.src}
                        alt="Logo SIAP TK"
                        className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-sm"
                    />
                    <div>
                        <span className="font-bold text-base text-[#095c51]">SIAP TK</span>
                        <p className="text-xs text-slate-500">TK Islam Nur Habib</p>
                    </div>
                </div>
                <button
                    onClick={onBackToLogin}
                    className="text-xs font-semibold text-[#095c51] hover:underline cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 inline-block align-middle mr-1" />
                    Kembali ke Login
                </button>
            </div>

            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-[#095c51] text-white p-8 md:p-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-800/80 border border-teal-600 rounded-full text-xs font-semibold text-teal-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        Pendaftaran Akun Keluarga Baru
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Buat Akun Keluarga
                    </h1>
                    <p className="text-xs md:text-sm text-teal-100/90">
                        Satu akun untuk semua anak Anda. Data Kartu Keluarga (KK) dan KTP Orang Tua cukup diunggah 1 kali ke database sekolah.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Nama Ayah <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.namaAyah}
                                onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                                placeholder="Contoh: Budi Pratama"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Nama Ibu <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.namaIbu}
                                onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                                placeholder="Contoh: Sari Pratama"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Pekerjaan Ayah
                            </label>
                            <input
                                type="text"
                                value={formData.pekerjaanAyah}
                                onChange={(e) => setFormData({ ...formData, pekerjaanAyah: e.target.value })}
                                placeholder="Contoh: Karyawan Swasta"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Pekerjaan Ibu
                            </label>
                            <input
                                type="text"
                                value={formData.pekerjaanIbu}
                                onChange={(e) => setFormData({ ...formData, pekerjaanIbu: e.target.value })}
                                placeholder="Contoh: Ibu Rumah Tangga"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Nomor WhatsApp <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.noWhatsapp}
                                onChange={(e) => setFormData({ ...formData, noWhatsapp: e.target.value })}
                                placeholder="0812xxxxxxxx"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Email Aktif <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="sari.pratama@gmail.com"
                                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Kata Sandi <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-4 pr-12 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
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

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-4 pr-12 py-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#095c51]/30 bg-slate-50/50"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-[#095c51] transition cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-[#095c51]"><Folder className="w-5 h-5" /></span>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900">Berkas Keluarga (Cukup diunggah 1x untuk semua anak)</h3>
                                <p className="text-[11px] text-slate-400">Format file yang didukung: JPG, PNG, atau PDF (Maksimal 2 MB per berkas).</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <input
                                    type="file"
                                    ref={kkInputRef}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFileKK(e.target.files[0]);
                                        }
                                    }}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => kkInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#095c51] transition bg-slate-50/50 cursor-pointer"
                                >
                                    <div className="text-[#095c51] flex justify-center mb-1"><Upload className="w-6 h-6" /></div>
                                    <div className="text-xs font-bold text-slate-800">Kartu Keluarga (KK) <span className="text-rose-500">*</span></div>
                                    <div className="text-[11px] text-[#095c51] mt-1 font-semibold truncate px-2">
                                        {fileKK ? `Terpilih: ${fileKK.name}` : "Klik untuk memilih file KK (Wajib)"}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    ref={ktpInputRef}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFileKTP(e.target.files[0]);
                                        }
                                    }}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => ktpInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#095c51] transition bg-slate-50/50 cursor-pointer"
                                >
                                    <div className="text-[#095c51] flex justify-center mb-1"><Upload className="w-6 h-6" /></div>
                                    <div className="text-xs font-bold text-slate-800">KTP Orang Tua / Wali <span className="text-rose-500">*</span></div>
                                    <div className="text-[11px] text-[#095c51] mt-1 font-semibold truncate px-2">
                                        {fileKTP ? `Terpilih: ${fileKTP.name}` : "Klik untuk memilih file KTP (Wajib)"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button
                            type="button"
                            onClick={onBackToLogin}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                            Sudah punya akun? <span className="text-[#095c51] underline">Login</span>
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3.5 bg-[#009688] hover:bg-[#00796b] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Menyimpan ke Database..." : "Buat Akun & Masuk"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}