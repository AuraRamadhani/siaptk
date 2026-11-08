import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { bacaToken, NAMA_KUKI, UMUR_MS, type Sesi } from './token';

// Logika token murni ada di lib/token.ts supaya bisa diuji unit tanpa Next.
export { NAMA_KUKI, SLUG, UMUR_MS, buatToken, bacaToken } from './token';
export type { Peran, Sesi } from './token';

/** Sesi aktif dari cookie (server component / route handler). */
export async function sesiSekarang(): Promise<Sesi | null> {
  try {
    // connection() wajib: tanpa itu Date.now() di bacaToken() dianggap nilai
    // tak stabil saat prerender dan build gagal (Blocking Route "/guru").
    await connection();
    const jar = await cookies();
    return bacaToken(jar.get(NAMA_KUKI)?.value);
  } catch {
    // Saat build, route handler ikut diprerender; connection()/cookies()
    // melempar karena prerender sudah selesai. Tidak ada sesi pada titik itu.
    return null;
  }
}

export const opsiKuki = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: UMUR_MS / 1000,
};