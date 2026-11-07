import { redirect } from 'next/navigation';
import BilahAtas from '@/components/BilahAtas';
import PortalKepalaSekolah from '@/components/PortalKepalaSekolah';
import { sesiSekarang } from '@/lib/sesi';

export const instant = false;

export default async function HalamanKepalaSekolah() {
  const sesi = await sesiSekarang();
  if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') redirect('/masuk/kepala-sekolah');
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <BilahAtas judul="Portal Kepala Sekolah" nama={sesi.nama} inisial="KS" />
      <div className="w-full flex-1">
        <PortalKepalaSekolah />
      </div>
    </main>
  );
}
