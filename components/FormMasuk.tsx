'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginRegister from '@/components/LoginRegister';
import InfoPublik from '@/components/InfoPublik';
import RegisterKeluarga from '@/components/RegisterKeluarga';
import { infoPeran } from '@/lib/peran';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';

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
    const infoKelompok = tentukanKelompokDariTglLahir(dateStr);
    if (infoKelompok) {
      setCalculatedGroup(infoKelompok.labelLengkap);
    } else {
      setCalculatedGroup('Usia di luar rentang standar KB/TK (3-6 tahun) — Hubungi Sekretariat');
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

  const daftarPortal = [
    { label: 'Orang Tua', slug: 'orang-tua' },
    { label: 'Guru', slug: 'guru' },
    { label: 'Bendahara', slug: 'bendahara' },
    { label: 'Kepala Sekolah', slug: 'kepala-sekolah' },
    { label: 'Super Admin', slug: 'super-admin' },
  ];

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
      onPilihPortal={(slug) => router.push(`/masuk/${slug}`)}
      peranSlug={peran}
      peranJudul={adalahOrangTua ? undefined : info?.judul}
      peranKode={kodePeran}
      galat={galat}
      memuat={memuat}
      tanpaDaftar={!adalahOrangTua}
      daftarPortal={daftarPortal}
    />
  );
}