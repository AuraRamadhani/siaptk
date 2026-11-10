import { redirect } from 'next/navigation';
import BilahAtas from '@/components/BilahAtas';
import PortalSuperAdmin from '@/components/PortalSuperAdmin';
import { sesiSekarang } from '@/lib/sesi';

export const instant = false;

export default async function HalamanSuperAdmin() {
  const sesi = await sesiSekarang();
  if (!sesi || sesi.peran !== 'SUPER_ADMIN') redirect('/masuk/super-admin');
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <BilahAtas judul="Portal Super Admin" nama={sesi.nama} inisial="SA" />
      <div className="w-full flex-1">
        <PortalSuperAdmin />
      </div>
    </main>
  );
}

