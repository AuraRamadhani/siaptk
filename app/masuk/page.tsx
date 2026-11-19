import { redirect } from 'next/navigation';
import { sesiSekarang, SLUG } from '@/lib/sesi';

export const instant = false;

export default async function HalamanMasuk() {
  const sesi = await sesiSekarang();
  if (sesi && SLUG[sesi.peran]) {
    redirect(`/${SLUG[sesi.peran]}`);
  }
  redirect('/masuk/orang-tua');
}
