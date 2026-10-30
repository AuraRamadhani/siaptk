// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import PortalOrangTua from '@/components/PortalOrangTua';
import PortalGuru from '@/components/PortalGuru';
import PortalBendahara from '@/components/PortalBendahara';
import PortalKepalaSekolah from '@/components/PortalKepalaSekolah';
import InfoPublik from '@/components/InfoPublik';
import LoginRegister from '@/components/LoginRegister';
import RegisterKeluarga from '@/components/RegisterKeluarga';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'public_info'>('login');

  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [inputName, setInputName] = useState('');
  const [childBirthDate, setChildBirthDate] = useState('');
  const [calculatedGroup, setCalculatedGroup] = useState<string | null>(null);

  const [currentRole, setRole] = useState<'parent' | 'teacher' | 'treasurer' | 'principal'>('parent');
  const [activeChildId, setActiveChildId] = useState('c1');
  const [currentView, setCurrentView] = useState('dashboard');

  const [childrenData, setChildrenData] = useState([
    {
      id: 'c1',
      name: 'Muhammad Al Fatih',
      classGroup: 'Kelompok B1 (Usia 5-6 Tahun)',
      sppStatus: 'Lunas',
      savingsBalance: 250000,
    }
  ]);

  // Fungsi Tambah Anak Baru / PPDB yang terhubung ke database API /api/auth
  const handleRegisterNewChild = async () => {
    const name = window.prompt("Masukkan nama lengkap calon siswa baru:");
    if (!name) return;

    const nik = window.prompt("Masukkan NIK anak (16 digit):") || "3171" + Math.floor(100000000000 + Math.random() * 900000000000);
    const tglLahir = window.prompt("Masukkan tanggal lahir (Format: YYYY-MM-DD):", "2021-05-10") || "2021-05-10";

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_child',
          email: inputEmail, // Mengaitkan dengan akun keluarga yang sedang login
          namaAnak: name,
          nikAnak: nik,
          tglLahirAnak: tglLahir,
        }),
      });

      const contentType = res.headers.get("content-type");
      let result;

      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const textResponse = await res.text();
        console.error("Non-JSON Response:", textResponse);
        throw new Error(`Server mengalami kendala (Status: ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(result.error || "Gagal mendaftarkan anak.");
      }

      if (result.success) {
        alert("Anak baru berhasil didaftarkan ke database SIAP TK!");
        setChildrenData([
          ...childrenData,
          {
            id: 'c' + (childrenData.length + 1),
            name: name,
            classGroup: 'Kelompok A1 (Baru)',
            sppStatus: 'Menunggu Verifikasi',
            savingsBalance: 0,
          }
        ]);
      } else {
        alert("Gagal mendaftarkan anak: " + result.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan: " + (err.message || "Gagal koneksi ke database."));
    }
  };

  // Fungsi Login yang terhubung ke database MySQL
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: inputEmail }),
      });

      const contentType = res.headers.get("content-type");
      let result;

      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const textResponse = await res.text();
        console.error("Non-JSON Response:", textResponse);
        throw new Error(`Server mengalami kendala (Status: ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(result.error || "Akun tidak ditemukan.");
      }

      if (result.success) {
        alert("Login berhasil ke database SIAP TK!");
        setIsLoggedIn(true);
      } else {
        alert(result.error || "Akun tidak ditemukan di database.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan: " + (err.message || "Gagal terhubung ke database server."));
    }
  };

  // Fungsi Registrasi Sederhana (Opsional jika form utama memakai RegisterKeluarga)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setViewMode('register');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setViewMode('login');
  };

  const handleCheckGroup = (dateStr: string) => {
    setChildBirthDate(dateStr);
    if (!dateStr) {
      setCalculatedGroup(null);
      return;
    }
    const birthDate = new Date(dateStr);
    const cutoffDate = new Date('2026-07-01');

    let age = cutoffDate.getFullYear() - birthDate.getFullYear();
    const m = cutoffDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && cutoffDate.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age >= 5 && age <= 6) {
      setCalculatedGroup('Kelompok B (TK B) - Usia 5-6 Tahun');
    } else if (age >= 4 && age < 5) {
      setCalculatedGroup('Kelompok A (TK A) - Usia 4-5 Tahun');
    } else if (age >= 3 && age < 4) {
      setCalculatedGroup('Kelompok Bermain (KB) - Usia 3-4 Tahun');
    } else {
      setCalculatedGroup('Usia di luar rentang standar TK (Hubungi Sekretariat)');
    }
  };

  if (!isLoggedIn && viewMode === 'public_info') {
    return (
      <InfoPublik
        onBackToLogin={() => setViewMode('login')}
        onGoToRegister={() => setViewMode('register')}
        childBirthDate={childBirthDate}
        setChildBirthDate={setChildBirthDate}
        calculatedGroup={calculatedGroup}
        handleCheckGroup={handleCheckGroup}
      />
    );
  }

  if (!isLoggedIn && viewMode === 'register') {
    return (
      <RegisterKeluarga
        onBackToLogin={() => setViewMode('login')}
        onSuccessRegister={() => setViewMode('login')}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginRegister
        authMode={viewMode === 'register' ? 'register' : 'login'}
        setAuthMode={(mode) => setViewMode(mode)}
        inputEmail={inputEmail}
        setInputEmail={setInputEmail}
        inputPassword={inputPassword}
        setInputPassword={setInputPassword}
        inputName={inputName}
        setInputName={setInputName}
        handleLoginSubmit={handleLoginSubmit}
        handleRegisterSubmit={handleRegisterSubmit}
        onGoToPublicInfo={() => setViewMode('public_info')}
        onLoginTeacher={() => { setRole('teacher'); setIsLoggedIn(true); }}
      />
    );
  }

  // JIKA SUDAH LOGIN: Tampilkan portal secara penuh
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 w-full flex flex-col">
      <div className="w-full flex-1">
        {currentRole === 'parent' && (
          <PortalOrangTua
            childrenData={childrenData}
            activeChildId={activeChildId}
            setActiveChildId={setActiveChildId}
            onRegisterClick={handleRegisterNewChild}
            onLogout={handleLogout}
            role={currentRole}
            setRole={setRole}
            setCurrentView={setCurrentView}
          />
        )}
        {currentRole === 'teacher' && <PortalGuru />}
        {currentRole === 'treasurer' && <PortalBendahara />}
        {currentRole === 'principal' && <PortalKepalaSekolah />}
      </div>
    </main>
  );
}