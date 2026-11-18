-- DropForeignKey
ALTER TABLE `anak` DROP FOREIGN KEY `anak_id_keluarga_fkey`;

-- DropForeignKey
ALTER TABLE `booking_kunjungan` DROP FOREIGN KEY `booking_kunjungan_id_slot_fkey`;

-- DropForeignKey
ALTER TABLE `laporan_mingguan` DROP FOREIGN KEY `laporan_mingguan_id_anak_fkey`;

-- DropForeignKey
ALTER TABLE `laporan_mingguan` DROP FOREIGN KEY `laporan_mingguan_id_tema_fkey`;

-- DropForeignKey
ALTER TABLE `pembayaran` DROP FOREIGN KEY `pembayaran_id_tagihan_fkey`;

-- DropForeignKey
ALTER TABLE `rekening_tabungan` DROP FOREIGN KEY `rekening_tabungan_id_anak_fkey`;

-- DropForeignKey
ALTER TABLE `riwayat_kelompok` DROP FOREIGN KEY `riwayat_kelompok_id_anak_fkey`;

-- DropForeignKey
ALTER TABLE `riwayat_kelompok` DROP FOREIGN KEY `riwayat_kelompok_id_kelompok_fkey`;

-- DropForeignKey
ALTER TABLE `riwayat_kelompok` DROP FOREIGN KEY `riwayat_kelompok_id_tahun_ajaran_fkey`;

-- DropForeignKey
ALTER TABLE `tagihan` DROP FOREIGN KEY `tagihan_id_anak_fkey`;

-- DropForeignKey
ALTER TABLE `transaksi_tabungan` DROP FOREIGN KEY `transaksi_tabungan_id_tabungan_fkey`;

-- AlterTable
ALTER TABLE `anak` ADD COLUMN `alasan_penolakan` TEXT NULL,
    ADD COLUMN `deadline_bayar` DATETIME(3) NULL,
    ADD COLUMN `jalur_pendaftaran` VARCHAR(191) NOT NULL DEFAULT 'Daring',
    ADD COLUMN `jenis_kelamin` VARCHAR(191) NOT NULL DEFAULT 'L';

-- AlterTable
ALTER TABLE `booking_kunjungan` ADD COLUMN `catatan_bendahara` TEXT NULL,
    ADD COLUMN `catatan_orang_tua` TEXT NULL,
    ADD COLUMN `jenis_booking` ENUM('UMUM', 'BAYAR_SPP', 'SETOR_TABUNGAN') NOT NULL DEFAULT 'UMUM';

-- AlterTable
ALTER TABLE `keluarga` ADD COLUMN `file_kk` VARCHAR(191) NULL,
    ADD COLUMN `file_ktp` VARCHAR(191) NULL,
    ADD COLUMN `kata_sandi` VARCHAR(191) NULL,
    MODIFY `alamat` TEXT NULL;

-- AlterTable
ALTER TABLE `pembayaran` ADD COLUMN `catatan_verifikasi` TEXT NULL;

-- AlterTable
ALTER TABLE `transaksi_tabungan` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `id_tagihan` VARCHAR(191) NULL,
    ADD COLUMN `keterangan` TEXT NULL,
    ADD COLUMN `metode` ENUM('TRANSFER', 'TUNAI', 'TABUNGAN') NOT NULL DEFAULT 'TUNAI',
    ADD COLUMN `status` ENUM('MENUNGGU', 'DIVERIFIKASI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU';

-- CreateTable
CREATE TABLE `akun_staf` (
    `id_akun` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `kata_sandi` VARCHAR(191) NOT NULL,
    `peran` ENUM('GURU', 'BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN') NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `akun_staf_email_key`(`email`),
    PRIMARY KEY (`id_akun`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penarikan_tabungan` (
    `id_penarikan` VARCHAR(191) NOT NULL,
    `id_tabungan` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(12, 2) NOT NULL,
    `keterangan` TEXT NULL,
    `status` ENUM('MENUNGGU', 'DIVERIFIKASI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `catatan_penolakan` TEXT NULL,
    `diajukan_oleh` VARCHAR(191) NOT NULL,
    `diverifikasi_oleh` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `penarikan_tabungan_id_tabungan_idx`(`id_tabungan`),
    INDEX `penarikan_tabungan_status_idx`(`status`),
    PRIMARY KEY (`id_penarikan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifikasi` (
    `id_notifikasi` VARCHAR(191) NOT NULL,
    `id_keluarga` VARCHAR(191) NOT NULL,
    `tipe` ENUM('TAGIHAN_BARU', 'PEMBAYARAN_DIVERIFIKASI', 'PEMBAYARAN_DITOLAK', 'SETORAN_DIVERIFIKASI', 'SETORAN_DITOLAK', 'PENARIKAN_DIVERIFIKASI', 'PENARIKAN_DITOLAK', 'ANAK_DITERIMA', 'ANAK_DITOLAK', 'DEADLINE_PEMBAYARAN', 'BOOKING_DIKONFIRMASI', 'BOOKING_DIBATALKAN', 'SALDO_TABUNGAN_BERUBAH') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `pesan` TEXT NOT NULL,
    `dibaca` BOOLEAN NOT NULL DEFAULT false,
    `data_referensi` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifikasi_id_keluarga_dibaca_idx`(`id_keluarga`, `dibaca`),
    INDEX `notifikasi_created_at_idx`(`created_at`),
    PRIMARY KEY (`id_notifikasi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `transaksi_tabungan_status_created_at_idx` ON `transaksi_tabungan`(`status`, `created_at`);

-- AddForeignKey
ALTER TABLE `booking_kunjungan` ADD CONSTRAINT `booking_kunjungan_id_slot_fkey` FOREIGN KEY (`id_slot`) REFERENCES `slot_jadwal`(`id_slot`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anak` ADD CONSTRAINT `anak_id_keluarga_fkey` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga`(`id_keluarga`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_kelompok_fkey` FOREIGN KEY (`id_kelompok`) REFERENCES `kelompok`(`id_kelompok`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_tahun_ajaran_fkey` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran`(`id_tahun_ajaran`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tagihan` ADD CONSTRAINT `tagihan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekening_tabungan` ADD CONSTRAINT `rekening_tabungan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi_tabungan` ADD CONSTRAINT `transaksi_tabungan_id_tabungan_fkey` FOREIGN KEY (`id_tabungan`) REFERENCES `rekening_tabungan`(`id_tabungan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penarikan_tabungan` ADD CONSTRAINT `penarikan_tabungan_id_tabungan_fkey` FOREIGN KEY (`id_tabungan`) REFERENCES `rekening_tabungan`(`id_tabungan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `pembayaran_id_tagihan_fkey` FOREIGN KEY (`id_tagihan`) REFERENCES `tagihan`(`id_tagihan`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `notifikasi_id_keluarga_fkey` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga`(`id_keluarga`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_mingguan` ADD CONSTRAINT `laporan_mingguan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_mingguan` ADD CONSTRAINT `laporan_mingguan_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `tema_pembelajaran`(`id_tema`) ON DELETE CASCADE ON UPDATE CASCADE;
