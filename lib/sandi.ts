import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Format tersimpan: "saltHex:hashHex" (scrypt, 64 byte). */
export function hashSandi(sandi: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(sandi, salt, 64).toString('hex')}`;
}

export function cekSandi(sandi: string, tersimpan: string | null | undefined): boolean {
  if (!tersimpan || !tersimpan.includes(':')) return false;
  const [salt, hash] = tersimpan.split(':');
  const uji = scryptSync(sandi, salt, 64);
  const asli = Buffer.from(hash, 'hex');
  return uji.length === asli.length && timingSafeEqual(uji, asli);
}