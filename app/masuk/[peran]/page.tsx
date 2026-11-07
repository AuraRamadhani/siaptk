import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import FormMasuk from '@/components/FormMasuk';
import { SLUGS_PERAN } from '@/lib/peran';
import { sesiSekarang, SLUG } from '@/lib/sesi';
/* eslint-disable @typescript-eslint/no-explicit-any -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

/** Baca sesi di dalam Suspense: connection() jadi dynamic hole, bukan blocker prerender. */
async function SudahMasuk({ peran }: { peran: string }) {
  const sesi = await sesiSekarang();
  if (sesi && SLUG[sesi.peran] === peran) redirect(`/${peran}`);
  return null;
}

export function generateStaticParams() {
  return SLUGS_PERAN.map((slug) => ({ peran: slug }));
}

export default async function MasukPeran({ params }: { params: Promise<{ peran: string }> }) {
  const { peran } = await params;
  // Validasi slug tanpa connection(), aman di prerender.
  if (!SLUGS_PERAN.includes(peran as any)) notFound();

  return (
    <>
      <Suspense fallback={null}>
        <SudahMasuk peran={peran} />
      </Suspense>
      <FormMasuk peran={peran} />
    </>
  );
}