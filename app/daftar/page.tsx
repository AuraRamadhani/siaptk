'use client';

import { useRouter } from 'next/navigation';
import RegisterKeluarga from '@/components/RegisterKeluarga';

// Pendaftaran akun keluarga — dipertahankan dari prototipe, terhubung API asli.
export default function HalamanDaftar() {
  const router = useRouter();
  return (
    <RegisterKeluarga
      onBackToLogin={() => router.push('/masuk/orang-tua')}
      onSuccessRegister={() => router.push('/masuk/orang-tua')}
    />
  );
}
