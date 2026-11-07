import { redirect } from 'next/navigation';
import BilahAtas from '@/components/BilahAtas';
import PortalBendahara from '@/components/PortalBendahara';
import { sesiSekarang } from '@/lib/sesi';

export const instant = false;

export default async function HalamanBendahara() {
  const sesi = await sesiSekarang();
  if (!sesi || sesi.peran !== 'BENDAHARA') redirect('/masuk/bendahara');
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <BilahAtas judul="Portal Bendahara" nama={sesi.nama} inisial="BD" />
      <div className="w-full flex-1">
        <PortalBendahara />
      </div>
    </main>
  );
}
