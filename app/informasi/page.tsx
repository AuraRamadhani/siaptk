'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoPublik from '@/components/InfoPublik';

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
