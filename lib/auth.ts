import { NextRequest, NextResponse } from 'next/server';
import { sesiSekarang, type Sesi, type Peran } from '@/lib/sesi';

/**
 * API auth middleware: require session and optionally check role.
 * Returns {sesi, error} tuple. If error, return 401/403 from caller.
 */
export async function cekSesiAPI(
  request: NextRequest,
  peranDiperlukan?: Peran | Peran[]
): Promise<{ sesi: Sesi | null; error: NextResponse | null }> {
  const sesi = await sesiSekarang();
  
  if (!sesi) {
    return {
      sesi: null,
      error: NextResponse.json(
        { success: false, error: 'Akses ditolak: silakan login terlebih dahulu.' },
        { status: 401 }
      ),
    };
  }

  if (peranDiperlukan) {
    const peranList = Array.isArray(peranDiperlukan) ? peranDiperlukan : [peranDiperlukan];
    if (!peranList.includes(sesi.peran)) {
      return {
        sesi: null,
        error: NextResponse.json(
          { success: false, error: 'Akses ditolak: peran tidak sesuai.' },
          { status: 403 }
        ),
      };
    }
  }

  return { sesi, error: null };
}
