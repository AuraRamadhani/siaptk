import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

export const NAMA_KUKI = 'siaptk_sesi';
const RAHASIA = () => {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  // Jangan gagal saat build; gagal saat dipakai di production.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diatur di production. Set di .env.');
  }
  return 'dev-siaptk-128bits-random-ganti-di-produksi';
};
const UMUR_MS = 1000 * 60 * 60 * 8;

export type Peran = 'ORANG_TUA' | 'GURU' | 'BENDAHARA' | 'KEPALA_SEKOLAH';
export type Sesi = { id: string; nama: string; peran: Peran; exp: number };

/** Peran -> slug URL. */
export const SLUG: Record<Peran, string> = {
  ORANG_TUA: 'orang-tua',
  GURU: 'guru',
  BENDAHARA: 'bendahara',
  KEPALA_SEKOLAH: 'kepala-sekolah',
};

const tandaTangan = (data: string) =>
  createHmac('sha256', RAHASIA()).update(data).digest('base64url');

export function buatToken(payload: Omit<Sesi, 'exp'>): string {
  const sesi: Sesi = { ...payload, exp: Date.now() + UMUR_MS };
  const data = Buffer.from(JSON.stringify(sesi)).toString('base64url');
  return `${data}.${tandaTangan(data)}`;
}

export function bacaToken(token: string | undefined): Sesi | null {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(tandaTangan(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const sesi = JSON.parse(Buffer.from(data, 'base64url').toString()) as Sesi;
    return sesi.exp > Date.now() ? sesi : null;
  } catch {
    return null;
  }
}

/** Sesi aktif dari cookie (server component / route handler). */
export async function sesiSekarang(): Promise<Sesi | null> {
  // connection() wajib: tanpa itu Date.now() di bacaToken() dianggap nilai tak
  // stabil saat prerender dan build gagal (Blocking Route "/guru").
  // Saat build, route handler ikut diprerender dan connection() melempar karena
  // prerender sudah selesai — ditelan; di request nyata tidak pernah melempar.
  try {
    await connection();
  } catch {
    /* prerender selesai — abaikan */
  }
  const jar = await cookies();
  return bacaToken(jar.get(NAMA_KUKI)?.value);
}

export const opsiKuki = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: UMUR_MS / 1000,
};