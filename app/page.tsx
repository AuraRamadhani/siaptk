import { redirect } from 'next/navigation';
import { sesiSekarang, SLUG } from '@/lib/sesi';

export const instant = false;

export default async function Beranda() {
  const sesi = await sesiSekarang();
  if (sesi) redirect(`/${SLUG[sesi.peran]}`);
  redirect('/masuk/orang-tua');
}