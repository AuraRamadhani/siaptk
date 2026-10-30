import { notFound, redirect } from 'next/navigation';
import FormMasuk from '@/components/FormMasuk';
import { infoPeran } from '@/lib/peran';
import { sesiSekarang, SLUG } from '@/lib/sesi';

export const instant = false;

export default async function MasukPeran({ params }: { params: Promise<{ peran: string }> }) {
  const { peran } = await params;
  if (!infoPeran(peran)) notFound();

  const sesi = await sesiSekarang();
  if (sesi && SLUG[sesi.peran] === peran) redirect(`/${peran}`);

  return <FormMasuk peran={peran} />;
}