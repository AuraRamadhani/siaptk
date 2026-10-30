import { redirect } from 'next/navigation';
import ShellOrangTua from '@/components/ShellOrangTua';
import { sesiSekarang } from '@/lib/sesi';

export const instant = false;

export default async function HalamanOrangTua() {
  const sesi = await sesiSekarang();
  if (!sesi || sesi.peran !== 'ORANG_TUA') redirect('/masuk/orang-tua');
  return <ShellOrangTua />;
}