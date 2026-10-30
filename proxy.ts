import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { bacaToken, NAMA_KUKI, SLUG, type Peran } from '@/lib/sesi';

const DILINDUNGI: { path: string; peran: Peran }[] = [
  { path: '/orang-tua', peran: 'ORANG_TUA' },
  { path: '/guru', peran: 'GURU' },
  { path: '/bendahara', peran: 'BENDAHARA' },
  { path: '/kepala-sekolah', peran: 'KEPALA_SEKOLAH' },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const aturan = DILINDUNGI.find((d) => pathname === d.path || pathname.startsWith(`${d.path}/`));
  if (!aturan) return NextResponse.next();

  const sesi = bacaToken(request.cookies.get(NAMA_KUKI)?.value);

  if (!sesi) {
    return NextResponse.redirect(new URL(`/masuk/${SLUG[aturan.peran]}`, request.url));
  }
  if (sesi.peran !== aturan.peran) {
    return NextResponse.redirect(new URL(`/${SLUG[sesi.peran]}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/orang-tua/:path*', '/guru/:path*', '/bendahara/:path*', '/kepala-sekolah/:path*'],
};