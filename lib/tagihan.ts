/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma, PrismaClient } from '@/app/generated/prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export const BIAYA_PENDAFTARAN_STANDAR = 1570000;
export const DEFAULT_TARIF_SPP = 350000;

export const NAMA_BULAN: Record<number, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maret',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Agustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Desember',
};

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
 * Mengambil nominal tarif SPP bulanan dinamis yang disimpan oleh Bendahara.
 */
export async function ambilTarifSpp(db: DbClient): Promise<number> {
  try {
    if ((db as any).pengaturan) {
      const row = await (db as any).pengaturan.findUnique({
        where: { kunci: 'TARIF_SPP_DEFAULT' },
      });
      if (row && Number(row.nilai) > 0) {
        return Number(row.nilai);
      }
    } else {
      const rows: any = await (db as any).$queryRawUnsafe(
        "SELECT nilai FROM pengaturan WHERE kunci = 'TARIF_SPP_DEFAULT' LIMIT 1"
      );
      if (rows && rows.length > 0 && Number(rows[0].nilai) > 0) {
        return Number(rows[0].nilai);
      }
    }
  } catch (err) {
    console.error('Gagal membaca tarif SPP dari pengaturan:', err);
  }
  return DEFAULT_TARIF_SPP;
}

/**
 * Menyimpan nominal tarif SPP bulanan dinamis oleh Bendahara.
 */
export async function simpanTarifSpp(db: DbClient, nominal: number): Promise<number> {
  const tarif = Math.max(0, Math.round(nominal));
  try {
    if ((db as any).pengaturan) {
      await (db as any).pengaturan.upsert({
        where: { kunci: 'TARIF_SPP_DEFAULT' },
        create: {
          kunci: 'TARIF_SPP_DEFAULT',
          nilai: String(tarif),
          keterangan: 'Tarif standar SPP bulanan yang diatur oleh Bendahara',
        },
        update: {
          nilai: String(tarif),
        },
      });
    } else {
      await (db as any).$executeRawUnsafe(
        "INSERT INTO pengaturan (kunci, nilai, keterangan, updated_at) VALUES ('TARIF_SPP_DEFAULT', ?, 'Tarif standar SPP bulanan yang diatur oleh Bendahara', NOW()) ON DUPLICATE KEY UPDATE nilai = ?, updated_at = NOW()",
        String(tarif),
        String(tarif)
      );
    }

    // Sinkronkan seluruh tagihan SPP yang belum lunas dengan tarif baru
    await db.tagihan.updateMany({
      where: {
        jenis: 'SPP',
        status: {
          not: 'LUNAS',
        },
      },
      data: {
        nominal: tarif,
      },
    });
  } catch (err) {
    console.error('Gagal menyimpan tarif SPP:', err);
    throw err;
  }
  return tarif;
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

/**
 * Memastikan siswa aktif memiliki tagihan SPP untuk bulan tertentu (default bulan berjalan).
 * Menggunakan nominal tarif SPP dinamis yang sedang aktif di sistem.
 */
export async function pastikanTagihanSppBulanan(
  db: DbClient,
  idAnak: string,
  bulan = new Date().getMonth() + 1
) {
  const sudahAda = await db.tagihan.findFirst({
    where: { idAnak, jenis: 'SPP', bulan },
  });
  if (sudahAda) return sudahAda;

  const tarif = await ambilTarifSpp(db);
  return db.tagihan.create({
    data: {
      idAnak,
      jenis: 'SPP',
      bulan,
      nominal: tarif,
      diskon: 0,
      status: 'BELUM_BAYAR',
    },
  });
}

/**
 * Batch generate tagihan SPP untuk semua anak yang berstatus AKTIF (atau terdaftar).
 */
export async function generateSppSemuaSiswa(
  db: DbClient,
  bulan = new Date().getMonth() + 1
) {
  const siswaList = await db.anak.findMany({
    where: { status: 'AKTIF' },
    select: { idAnak: true, nama: true, idKeluarga: true },
  });

  const tarif = await ambilTarifSpp(db);
  let dibuat = 0;

  for (const s of siswaList) {
    const ada = await db.tagihan.findFirst({
      where: { idAnak: s.idAnak, jenis: 'SPP', bulan },
    });
    if (!ada) {
      await db.tagihan.create({
        data: {
          idAnak: s.idAnak,
          jenis: 'SPP',
          bulan,
          nominal: tarif,
          diskon: 0,
          status: 'BELUM_BAYAR',
        },
      });

      // Buat notifikasi ke keluarga
      try {
        await db.notifikasi.create({
          data: {
            idKeluarga: s.idKeluarga,
            tipe: 'TAGIHAN_BARU',
            judul: `Tagihan SPP Bulan ${NAMA_BULAN[bulan] || bulan}`,
            pesan: `Tagihan SPP bulan ${NAMA_BULAN[bulan] || bulan} sebesar Rp${tarif.toLocaleString('id-ID')} untuk ${s.nama} telah diterbitkan. Silakan melakukan pembayaran.`,
            dataReferensi: JSON.stringify({ jenis: 'SPP', bulan, nominal: tarif, idAnak: s.idAnak }),
          },
        });
      } catch (err) {
        console.error('Gagal membuat notif SPP:', err);
      }

      dibuat++;
    }
  }

  return { totalSiswa: siswaList.length, dibuat, bulan, tarif };
}
