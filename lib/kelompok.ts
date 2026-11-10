import type { Prisma, PrismaClient } from '@/app/generated/prisma/client';
import { tentukanKelompokDariTglLahir } from '@/lib/usia';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Memastikan kelompok (KB, TK A, TK B) dan tahun ajaran aktif tersedia,
 * lalu menautkan anak ke riwayat kelompok secara otomatis sesuai usianya.
 */
export async function otomatisKelompokAnak(
  db: DbClient,
  idAnak: string,
  tglLahir: Date | string
) {
  const info = tentukanKelompokDariTglLahir(tglLahir);
  if (!info) return null;

  let tahunAktif = await db.tahunAjaran.findFirst({
    where: { statusAktif: true },
  });
  if (!tahunAktif) {
    tahunAktif = await db.tahunAjaran.create({
      data: { periode: '2026/2027', statusAktif: true },
    });
  }

  let kelompok = await db.kelompok.findFirst({
    where: {
      usiaMin: info.usiaMin,
      usiaMaks: info.usiaMaks,
    },
  });
  if (!kelompok) {
    kelompok = await db.kelompok.create({
      data: {
        nama: info.nama,
        usiaMin: info.usiaMin,
        usiaMaks: info.usiaMaks,
      },
    });
  }

  const sudahAda = await db.riwayatKelompok.findFirst({
    where: {
      idAnak,
      idTahunAjaran: tahunAktif.idTahunAjaran,
    },
  });

  if (!sudahAda) {
    await db.riwayatKelompok.create({
      data: {
        idAnak,
        idKelompok: kelompok.idKelompok,
        idTahunAjaran: tahunAktif.idTahunAjaran,
      },
    });
  }

  return { info, kelompok, tahunAktif };
}

