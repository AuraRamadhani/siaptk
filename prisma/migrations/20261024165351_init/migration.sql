-- CreateEnum
CREATE TYPE "JenisBerkasKeluarga" AS ENUM ('KK', 'KTP_ORTU');

-- CreateEnum
CREATE TYPE "JenisBerkasAnak" AS ENUM ('AKTA', 'KIA', 'PAS_FOTO');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('MENUNGGU', 'DIVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusBooking" AS ENUM ('MENUNGGU', 'DIKONFIRMASI', 'DIBATALKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusAnak" AS ENUM ('PENDAFTAR', 'AKTIF');

-- CreateEnum
CREATE TYPE "JenisTagihan" AS ENUM ('SPP', 'PENDAFTARAN');

-- CreateEnum
CREATE TYPE "StatusTagihan" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('TRANSFER', 'TUNAI', 'TABUNGAN');

-- CreateEnum
CREATE TYPE "JenisTransaksiTabungan" AS ENUM ('SETOR', 'TARIK', 'BAYAR_SPP');

-- CreateTable
CREATE TABLE "keluarga" (
    "id_keluarga" UUID NOT NULL,
    "nama_ayah" TEXT,
    "nama_ibu" TEXT,
    "no_hp" TEXT NOT NULL,
    "email" TEXT,
    "alamat" TEXT NOT NULL,

    CONSTRAINT "keluarga_pkey" PRIMARY KEY ("id_keluarga")
);

-- CreateTable
CREATE TABLE "berkas_keluarga" (
    "id_berkas_kel" UUID NOT NULL,
    "id_keluarga" UUID NOT NULL,
    "jenis" "JenisBerkasKeluarga" NOT NULL,
    "file" TEXT NOT NULL,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'MENUNGGU',

    CONSTRAINT "berkas_keluarga_pkey" PRIMARY KEY ("id_berkas_kel")
);

-- CreateTable
CREATE TABLE "slot_jadwal" (
    "id_slot" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "jam" TIME(0) NOT NULL,
    "kuota" INTEGER NOT NULL,

    CONSTRAINT "slot_jadwal_pkey" PRIMARY KEY ("id_slot")
);

-- CreateTable
CREATE TABLE "booking_kunjungan" (
    "id_booking" UUID NOT NULL,
    "id_keluarga" UUID NOT NULL,
    "id_slot" UUID NOT NULL,
    "status" "StatusBooking" NOT NULL DEFAULT 'MENUNGGU',

    CONSTRAINT "booking_kunjungan_pkey" PRIMARY KEY ("id_booking")
);

-- CreateTable
CREATE TABLE "kelompok" (
    "id_kelompok" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "usia_min" INTEGER NOT NULL,
    "usia_maks" INTEGER NOT NULL,

    CONSTRAINT "kelompok_pkey" PRIMARY KEY ("id_kelompok")
);

-- CreateTable
CREATE TABLE "anak" (
    "id_anak" UUID NOT NULL,
    "id_keluarga" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "tgl_lahir" DATE NOT NULL,
    "status" "StatusAnak" NOT NULL DEFAULT 'PENDAFTAR',

    CONSTRAINT "anak_pkey" PRIMARY KEY ("id_anak")
);

-- CreateTable
CREATE TABLE "berkas_anak" (
    "id_berkas_anak" UUID NOT NULL,
    "id_anak" UUID NOT NULL,
    "jenis" "JenisBerkasAnak" NOT NULL,
    "file" TEXT NOT NULL,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'MENUNGGU',

    CONSTRAINT "berkas_anak_pkey" PRIMARY KEY ("id_berkas_anak")
);

-- CreateTable
CREATE TABLE "tahun_ajaran" (
    "id_tahun_ajaran" UUID NOT NULL,
    "periode" TEXT NOT NULL,
    "status_aktif" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tahun_ajaran_pkey" PRIMARY KEY ("id_tahun_ajaran")
);

-- CreateTable
CREATE TABLE "riwayat_kelompok" (
    "id_riwayat" UUID NOT NULL,
    "id_anak" UUID NOT NULL,
    "id_kelompok" UUID NOT NULL,
    "id_tahun_ajaran" UUID NOT NULL,

    CONSTRAINT "riwayat_kelompok_pkey" PRIMARY KEY ("id_riwayat")
);

-- CreateTable
CREATE TABLE "tagihan" (
    "id_tagihan" UUID NOT NULL,
    "id_anak" UUID NOT NULL,
    "jenis" "JenisTagihan" NOT NULL,
    "bulan" INTEGER,
    "nominal" DECIMAL(12,2) NOT NULL,
    "diskon" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusTagihan" NOT NULL DEFAULT 'BELUM_BAYAR',

    CONSTRAINT "tagihan_pkey" PRIMARY KEY ("id_tagihan")
);

-- CreateTable
CREATE TABLE "rekening_tabungan" (
    "id_tabungan" UUID NOT NULL,
    "id_anak" UUID NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "rekening_tabungan_pkey" PRIMARY KEY ("id_tabungan")
);

-- CreateTable
CREATE TABLE "transaksi_tabungan" (
    "id_transaksi" UUID NOT NULL,
    "id_tabungan" UUID NOT NULL,
    "jenis" "JenisTransaksiTabungan" NOT NULL,
    "nominal" DECIMAL(12,2) NOT NULL,
    "bukti" TEXT,
    "dicatat_oleh" TEXT,

    CONSTRAINT "transaksi_tabungan_pkey" PRIMARY KEY ("id_transaksi")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id_pembayaran" UUID NOT NULL,
    "id_tagihan" UUID NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "bukti_transfer" TEXT,
    "diverifikasi_oleh" TEXT,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id_pembayaran")
);

-- CreateTable
CREATE TABLE "tema_pembelajaran" (
    "id_tema" UUID NOT NULL,
    "nama_tema" TEXT NOT NULL,
    "minggu_ke" INTEGER NOT NULL,

    CONSTRAINT "tema_pembelajaran_pkey" PRIMARY KEY ("id_tema")
);

-- CreateTable
CREATE TABLE "laporan_mingguan" (
    "id_laporan" UUID NOT NULL,
    "id_anak" UUID NOT NULL,
    "id_tema" UUID NOT NULL,
    "aspek" TEXT NOT NULL,
    "catatan_kegiatan" TEXT NOT NULL,

    CONSTRAINT "laporan_mingguan_pkey" PRIMARY KEY ("id_laporan")
);

-- CreateIndex
CREATE UNIQUE INDEX "keluarga_email_key" ON "keluarga"("email");

-- CreateIndex
CREATE INDEX "berkas_keluarga_id_keluarga_idx" ON "berkas_keluarga"("id_keluarga");

-- CreateIndex
CREATE INDEX "booking_kunjungan_id_keluarga_idx" ON "booking_kunjungan"("id_keluarga");

-- CreateIndex
CREATE INDEX "booking_kunjungan_id_slot_idx" ON "booking_kunjungan"("id_slot");

-- CreateIndex
CREATE UNIQUE INDEX "anak_nik_key" ON "anak"("nik");

-- CreateIndex
CREATE INDEX "anak_id_keluarga_idx" ON "anak"("id_keluarga");

-- CreateIndex
CREATE INDEX "berkas_anak_id_anak_idx" ON "berkas_anak"("id_anak");

-- CreateIndex
CREATE INDEX "riwayat_kelompok_id_anak_idx" ON "riwayat_kelompok"("id_anak");

-- CreateIndex
CREATE INDEX "riwayat_kelompok_id_kelompok_idx" ON "riwayat_kelompok"("id_kelompok");

-- CreateIndex
CREATE INDEX "riwayat_kelompok_id_tahun_ajaran_idx" ON "riwayat_kelompok"("id_tahun_ajaran");

-- CreateIndex
CREATE INDEX "tagihan_id_anak_idx" ON "tagihan"("id_anak");

-- CreateIndex
CREATE UNIQUE INDEX "rekening_tabungan_id_anak_key" ON "rekening_tabungan"("id_anak");

-- CreateIndex
CREATE INDEX "transaksi_tabungan_id_tabungan_idx" ON "transaksi_tabungan"("id_tabungan");

-- CreateIndex
CREATE INDEX "pembayaran_id_tagihan_idx" ON "pembayaran"("id_tagihan");

-- CreateIndex
CREATE INDEX "laporan_mingguan_id_anak_idx" ON "laporan_mingguan"("id_anak");

-- CreateIndex
CREATE INDEX "laporan_mingguan_id_tema_idx" ON "laporan_mingguan"("id_tema");

-- AddForeignKey
ALTER TABLE "berkas_keluarga" ADD CONSTRAINT "berkas_keluarga_id_keluarga_fkey" FOREIGN KEY ("id_keluarga") REFERENCES "keluarga"("id_keluarga") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_kunjungan" ADD CONSTRAINT "booking_kunjungan_id_keluarga_fkey" FOREIGN KEY ("id_keluarga") REFERENCES "keluarga"("id_keluarga") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_kunjungan" ADD CONSTRAINT "booking_kunjungan_id_slot_fkey" FOREIGN KEY ("id_slot") REFERENCES "slot_jadwal"("id_slot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anak" ADD CONSTRAINT "anak_id_keluarga_fkey" FOREIGN KEY ("id_keluarga") REFERENCES "keluarga"("id_keluarga") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas_anak" ADD CONSTRAINT "berkas_anak_id_anak_fkey" FOREIGN KEY ("id_anak") REFERENCES "anak"("id_anak") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelompok" ADD CONSTRAINT "riwayat_kelompok_id_anak_fkey" FOREIGN KEY ("id_anak") REFERENCES "anak"("id_anak") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelompok" ADD CONSTRAINT "riwayat_kelompok_id_kelompok_fkey" FOREIGN KEY ("id_kelompok") REFERENCES "kelompok"("id_kelompok") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelompok" ADD CONSTRAINT "riwayat_kelompok_id_tahun_ajaran_fkey" FOREIGN KEY ("id_tahun_ajaran") REFERENCES "tahun_ajaran"("id_tahun_ajaran") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_id_anak_fkey" FOREIGN KEY ("id_anak") REFERENCES "anak"("id_anak") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekening_tabungan" ADD CONSTRAINT "rekening_tabungan_id_anak_fkey" FOREIGN KEY ("id_anak") REFERENCES "anak"("id_anak") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_tabungan" ADD CONSTRAINT "transaksi_tabungan_id_tabungan_fkey" FOREIGN KEY ("id_tabungan") REFERENCES "rekening_tabungan"("id_tabungan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_id_tagihan_fkey" FOREIGN KEY ("id_tagihan") REFERENCES "tagihan"("id_tagihan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_mingguan" ADD CONSTRAINT "laporan_mingguan_id_anak_fkey" FOREIGN KEY ("id_anak") REFERENCES "anak"("id_anak") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_mingguan" ADD CONSTRAINT "laporan_mingguan_id_tema_fkey" FOREIGN KEY ("id_tema") REFERENCES "tema_pembelajaran"("id_tema") ON DELETE RESTRICT ON UPDATE CASCADE;
