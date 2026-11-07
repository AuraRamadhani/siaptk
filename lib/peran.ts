// Peta peran: slug URL <-> kode peran di sesi/database + metadata tampilan.
// Modul netral (tanpa 'use client') supaya bisa dipakai server component
// maupun client component — export dari file 'use client' menjadi client
// reference dan tidak terbaca sebagai objek biasa di server.
export type SlugPeran = 'orang-tua' | 'guru' | 'bendahara' | 'kepala-sekolah';
export type KodePeran = 'ORANG_TUA' | 'GURU' | 'BENDAHARA' | 'KEPALA_SEKOLAH';

export interface InfoPeran {
  judul: string;
  slug: SlugPeran;
  kode: KodePeran;
  email: string;
  warna: string;
}

export const INFO_PERAN: Record<SlugPeran, InfoPeran> = {
  'orang-tua': { judul: 'Orang Tua / Wali', slug: 'orang-tua', kode: 'ORANG_TUA', email: 'keluarga.pratama@email.com', warna: 'bg-[#095c51]' },
  guru: { judul: 'Guru Kelas', slug: 'guru', kode: 'GURU', email: 'guru@siaptk.sch.id', warna: 'bg-emerald-700' },
  bendahara: { judul: 'Bendahara Sekolah', slug: 'bendahara', kode: 'BENDAHARA', email: 'bendahara@siaptk.sch.id', warna: 'bg-amber-700' },
  'kepala-sekolah': { judul: 'Kepala Sekolah', slug: 'kepala-sekolah', kode: 'KEPALA_SEKOLAH', email: 'kepsek@siaptk.sch.id', warna: 'bg-indigo-700' },
};

export const SLUGS_PERAN = Object.keys(INFO_PERAN) as SlugPeran[];

export function infoPeran(slug: string): InfoPeran | undefined {
  return INFO_PERAN[slug as SlugPeran];
}
