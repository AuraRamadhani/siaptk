import { redirect } from 'next/navigation';
import BilahAtas from '@/components/BilahAtas';
import PortalGuru from '@/components/PortalGuru';
import { sesiSekarang } from '@/lib/sesi';

export const instant = false;

export default async function HalamanGuru() {
  const sesi = await sesiSekarang();
  if (!sesi || sesi.peran !== 'GURU') redirect('/masuk/guru');
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <BilahAtas judul="Portal Guru Kelas" nama={sesi.nama} inisial="GR" />
      <div className="w-full flex-1 px-6 md:px-12 py-10">
        <PortalGuru />
      </div>
    </main>
  );
}
