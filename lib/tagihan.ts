import type { Prisma, PrismaClient } from '@/app/generated/prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export const BIAYA_PENDAFTARAN_STANDAR = 1570000;

export function hitungDiskonPendaftaran(acuan = new Date()): number {
  const bulan = acuan.getMonth() + 1; // 1..12
  if (bulan === 12 || bulan === 1 || bulan === 2) {
    return Math.round(BIAYA_PENDAFTARAN_STANDAR * 0.3);
  }
  if (bulan === 3 || bulan === 4) {
    return Math.round(BIAYA_PENDAFTARAN_STANDAR * 0.2);
  }
  if (bulan === 5 || bulan === 6) {
    return Math.round(BIAYA_PENDAFTARAN_STANDAR * 0.1);
  }
  return 0;
}

/**
 * Memastikan calon siswa memiliki tagihan biaya pendaftaran awal (Rp1.570.000
 * dikurangi diskon gelombang periode pendaftaran jika berlaku).
 */
export async function buatTagihanPendaftaran(
  db: DbClient,
  idAnak: string,
  acuan = new Date()
) {
  const sudahAda = await db.tagihan.findFirst({
    where: { idAnak, jenis: 'PENDAFTARAN' },
  });
  if (sudahAda) return sudahAda;

  const diskon = hitungDiskonPendaftaran(acuan);
  return db.tagihan.create({
    data: {
      idAnak,
      jenis: 'PENDAFTARAN',
      bulan: null,
      nominal: BIAYA_PENDAFTARAN_STANDAR,
      diskon,
      status: 'BELUM_BAYAR',
    },
  });
}

