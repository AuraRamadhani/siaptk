'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginRegister from '@/components/LoginRegister';
import InfoPublik from '@/components/InfoPublik';
import RegisterKeluarga from '@/components/RegisterKeluarga';
import { infoPeran } from '@/lib/peran';

export default function FormMasuk({ peran }: { peran: string }) {
  const router = useRouter();
  const info = infoPeran(peran);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [viewMode, setViewMode] = useState<'form' | 'public_info' | 'register_full'>('form');

  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [inputName, setInputName] = useState('');
  const [childBirthDate, setChildBirthDate] = useState('');
  const [calculatedGroup, setCalculatedGroup] = useState<string | null>(null);

  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(false);

  const kodePeran = info?.kode || 'ORANG_TUA';
  const adalahOrangTua = peran === 'orang-tua';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMemuat(true);

    try {
      const res = await fetch('/api/auth/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peran: kodePeran,
          email: inputEmail,
          kataSandi: inputPassword,
        }),
      });

      const hasil = await res.json();
      if (!res.ok || !hasil.success) {
        throw new Error(hasil.error || 'Email atau kata sandi tidak sesuai.');
      }

      router.push(`/${peran}`);
      router.refresh();
    } catch (err: unknown) {
      setGalat(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setMemuat(false);
    }
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

  if (viewMode === 'public_info') {
    return (
      <InfoPublik
        onBackToLogin={() => setViewMode('form')}
        onGoToRegister={() => {
          if (adalahOrangTua) setViewMode('register_full');
          else router.push('/masuk/orang-tua');
        }}
        childBirthDate={childBirthDate}
        setChildBirthDate={setChildBirthDate}
        calculatedGroup={calculatedGroup}
        handleCheckGroup={handleCheckGroup}
      />
    );
  }

  if (viewMode === 'register_full') {
    return (
      <RegisterKeluarga
        onBackToLogin={() => setViewMode('form')}
        onSuccessRegister={() => {
          setViewMode('form');
          setAuthMode('login');
        }}
      />
    );
  }

  const tombolAksiKedua = () => {
    if (adalahOrangTua) {
      router.push('/masuk/guru');
    } else {
      router.push('/masuk/orang-tua');
    }
  };

  const labelAksiKedua = adalahOrangTua
    ? '👤 Masuk Portal Guru'
    : '🏠 Portal Orang Tua';

  // Tautan cepat ke portal peran lain (pengganti dropdown "Lihat sebagai" prototipe).
  const tautanPeran = [
    { label: 'Orang Tua', href: '/masuk/orang-tua' },
    { label: 'Guru', href: '/masuk/guru' },
    { label: 'Bendahara', href: '/masuk/bendahara' },
    { label: 'Kepala Sekolah', href: '/masuk/kepala-sekolah' },
  ].filter((t) => !t.href.endsWith(`/${peran}`));

  return (
    <LoginRegister
      authMode={authMode}
      setAuthMode={(mode) => {
        if (mode === 'register') {
          setViewMode('register_full');
        } else {
          setAuthMode(mode);
        }
      }}
      inputEmail={inputEmail}
      setInputEmail={setInputEmail}
      inputPassword={inputPassword}
      setInputPassword={setInputPassword}
      inputName={inputName}
      setInputName={setInputName}
      handleLoginSubmit={handleLoginSubmit}
      handleRegisterSubmit={(e) => {
        e.preventDefault();
        setViewMode('register_full');
      }}
      onGoToPublicInfo={() => setViewMode('public_info')}
      onLoginTeacher={tombolAksiKedua}
      peranJudul={adalahOrangTua ? undefined : info?.judul}
      galat={galat}
      memuat={memuat}
      tanpaDaftar={!adalahOrangTua}
      labelAksiKedua={labelAksiKedua}
      tautanPeran={tautanPeran}
    />
  );
}