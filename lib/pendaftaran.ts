import type { Prisma, PrismaClient } from '@/app/generated/prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Batas waktu pembayaran biaya pendaftaran setelah anak ditetapkan diterima. */
export const DEADLINE_HARI = 14;

/** Tanggal batas pembayaran: hari ini ditambah DEADLINE_HARI. */
export function hitungDeadline(acuan = new Date(), hari = DEADLINE_HARI): Date {
  const deadline = new Date(acuan);
  deadline.setDate(deadline.getDate() + hari);
  return deadline;
}

/** True bila tanggal batas sudah lewat (bukan hari ini). */
export function sudahLewatDeadline(deadline: Date | string | null | undefined, kini = new Date()): boolean {
  if (!deadline) return false;
  const batas = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(batas.getTime())) return false;
  // Deadline hari ini masih boleh; baru batal setelah tengah malam berikutnya.
  const akhirHari = new Date(batas);
  akhirHari.setHours(23, 59, 59, 999);
  return akhirHari.getTime() < kini.getTime();
}

/**
 * Batalkan pendaftaran yang melewati batas pembayaran.
 * Dipanggil saat daftar calon siswa dibuka (dashboard, arsip, portal orang tua)
 * dan oleh penjadwal — tidak perlu cron terpisah agar tetap berjalan.
 *
 * Tagihan pendaftaran yang sudah LUNAS tidak dibatalkan: anak tetap menjadi
 * siswa aktif lewat alur verifikasi pembayaran yang sudah ada.
 */
export async function batalkanPendaftaranKedaluwarsa(db: DbClient, kini = new Date()) {
  const calon = await db.anak.findMany({
    where: { status: 'PENDAFTAR', deadlineBayar: { not: null } },
    select: { idAnak: true, nama: true, idKeluarga: true, deadlineBayar: true },
  });

  const lewat = calon.filter((a) => sudahLewatDeadline(a.deadlineBayar, kini));
  const dibatalkan: { idAnak: string; nama: string }[] = [];
  const dilewati: { idAnak: string; nama: string; alasan: string }[] = [];

  for (const anak of lewat) {
    try {
      const pendaftaran = await db.tagihan.findFirst({
        where: { idAnak: anak.idAnak, jenis: 'PENDAFTARAN' },
        select: { idTagihan: true, status: true },
      });

      // Sudah membayar tetapi verifikasinya belum selesai -> tahan dulu, jangan ditolak.
      if (pendaftaran?.status === 'LUNAS' || pendaftaran?.status === 'MENUNGGU_VERIFIKASI') {
        dilewati.push({
          idAnak: anak.idAnak,
          nama: anak.nama,
          alasan: pendaftaran.status === 'LUNAS' ? 'sudah lunas' : 'menunggu verifikasi pembayaran',
        });
        continue;
      }

      if (pendaftaran) {
        // updateMany: tidak melempar galat bila baris sudah berubah atau terhapus.
        await db.tagihan.updateMany({
          where: { idTagihan: pendaftaran.idTagihan, status: { not: 'LUNAS' } },
          data: { status: 'DIBATALKAN' },
        });
      }

      // Ditandai ditolak agar terlihat di dashboard, tetapi kepala sekolah tetap
      // dapat menerima ulang bila orang tua datang membayar terlambat
      // (lihat PATCH aksi "terima" yang menghapus alasan dan menerbitkan tagihan lagi).
      await db.anak.update({
        where: { idAnak: anak.idAnak },
        data: {
          deadlineBayar: null,
          alasanPenolakan: 'Ditolak otomatis: batas waktu pembayaran habis',
        },
      });

      await db.notifikasi.create({
        data: {
          idKeluarga: anak.idKeluarga,
          tipe: 'DEADLINE_PEMBAYARAN',
          judul: 'Batas Waktu Pembayaran Habis',
          pesan: `Batas waktu pembayaran biaya pendaftaran untuk ${anak.nama} telah habis. Pendaftaran ditolak otomatis. Silakan hubungi sekolah untuk pendaftaran ulang.`,
          dataReferensi: JSON.stringify({ idAnak: anak.idAnak }),
        },
      });

      dibatalkan.push({ idAnak: anak.idAnak, nama: anak.nama });
    } catch (err) {
      console.error(`Gagal membatalkan pendaftaran ${anak.nama}:`, err);
      dilewati.push({ idAnak: anak.idAnak, nama: anak.nama, alasan: 'gagal diproses' });
    }
  }

  return { dibatalkan, dilewati };
}
