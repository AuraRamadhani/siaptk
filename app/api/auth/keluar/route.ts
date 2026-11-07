import { NextResponse } from 'next/server';
import { NAMA_KUKI } from '@/lib/sesi';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(NAMA_KUKI, '', { path: '/', maxAge: 0 });
  return res;
}