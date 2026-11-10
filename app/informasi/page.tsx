'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoPublik from '@/components/InfoPublik';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';

// Halaman informasi pendaftaran publik — dipertahankan dari prototipe.
export default function HalamanInformasi() {
  const router = useRouter();
  const [childBirthDate, setChildBirthDate] = useState('');
  const [calculatedGroup, setCalculatedGroup] = useState<string | null>(null);

  const handleCheckGroup = (dateStr: string) => {
    setChildBirthDate(dateStr);
    if (!dateStr) {
      setCalculatedGroup(null);
      return;
    }
    const info = tentukanKelompokDariTglLahir(dateStr);
    if (info) {
      setCalculatedGroup(info.labelLengkap);
    } else {
      setCalculatedGroup('Usia di luar rentang standar KB/TK (3-6 tahun) — Hubungi Sekretariat');
    }
  };

  return (
    <InfoPublik
      onBackToLogin={() => router.push('/masuk/orang-tua')}
      onGoToRegister={() => router.push('/daftar')}
      childBirthDate={childBirthDate}
      setChildBirthDate={setChildBirthDate}
      calculatedGroup={calculatedGroup}
      handleCheckGroup={handleCheckGroup}
    />
  );
}
