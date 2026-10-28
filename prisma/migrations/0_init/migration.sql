-- CreateTable
CREATE TABLE `keluarga` (
    `id_keluarga` VARCHAR(191) NOT NULL,
    `nama_ayah` VARCHAR(191) NULL,
    `nama_ibu` VARCHAR(191) NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `alamat` TEXT NOT NULL,

    UNIQUE INDEX `keluarga_email_key`(`email`),
    PRIMARY KEY (`id_keluarga`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berkas_keluarga` (
    `id_berkas_kel` VARCHAR(191) NOT NULL,
    `id_keluarga` VARCHAR(191) NOT NULL,
    `jenis` ENUM('KK', 'KTP_ORTU') NOT NULL,
    `file` TEXT NOT NULL,
    `status_verifikasi` ENUM('MENUNGGU', 'DIVERIFIKASI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',

    INDEX `berkas_keluarga_id_keluarga_idx`(`id_keluarga`),
    PRIMARY KEY (`id_berkas_kel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_jadwal` (
    `id_slot` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `jam` TIME(0) NOT NULL,
    `kuota` INTEGER NOT NULL,

    PRIMARY KEY (`id_slot`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_kunjungan` (
    `id_booking` VARCHAR(191) NOT NULL,
    `id_keluarga` VARCHAR(191) NOT NULL,
    `id_slot` VARCHAR(191) NOT NULL,
    `status` ENUM('MENUNGGU', 'DIKONFIRMASI', 'DIBATALKAN', 'SELESAI') NOT NULL DEFAULT 'MENUNGGU',

    INDEX `booking_kunjungan_id_keluarga_idx`(`id_keluarga`),
    INDEX `booking_kunjungan_id_slot_idx`(`id_slot`),
    PRIMARY KEY (`id_booking`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelompok` (
    `id_kelompok` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `usia_min` INTEGER NOT NULL,
    `usia_maks` INTEGER NOT NULL,

    PRIMARY KEY (`id_kelompok`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anak` (
    `id_anak` VARCHAR(191) NOT NULL,
    `id_keluarga` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `tgl_lahir` DATE NOT NULL,
    `status` ENUM('PENDAFTAR', 'AKTIF') NOT NULL DEFAULT 'PENDAFTAR',

    UNIQUE INDEX `anak_nik_key`(`nik`),
    INDEX `anak_id_keluarga_idx`(`id_keluarga`),
    PRIMARY KEY (`id_anak`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `berkas_anak` (
    `id_berkas_anak` VARCHAR(191) NOT NULL,
    `id_anak` VARCHAR(191) NOT NULL,
    `jenis` ENUM('AKTA', 'KIA', 'PAS_FOTO') NOT NULL,
    `file` TEXT NOT NULL,
    `status_verifikasi` ENUM('MENUNGGU', 'DIVERIFIKASI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',

    INDEX `berkas_anak_id_anak_idx`(`id_anak`),
    PRIMARY KEY (`id_berkas_anak`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tahun_ajaran` (
    `id_tahun_ajaran` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `status_aktif` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id_tahun_ajaran`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayat_kelompok` (
    `id_riwayat` VARCHAR(191) NOT NULL,
    `id_anak` VARCHAR(191) NOT NULL,
    `id_kelompok` VARCHAR(191) NOT NULL,
    `id_tahun_ajaran` VARCHAR(191) NOT NULL,

    INDEX `riwayat_kelompok_id_anak_idx`(`id_anak`),
    INDEX `riwayat_kelompok_id_kelompok_idx`(`id_kelompok`),
    INDEX `riwayat_kelompok_id_tahun_ajaran_idx`(`id_tahun_ajaran`),
    PRIMARY KEY (`id_riwayat`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tagihan` (
    `id_tagihan` VARCHAR(191) NOT NULL,
    `id_anak` VARCHAR(191) NOT NULL,
    `jenis` ENUM('SPP', 'PENDAFTARAN') NOT NULL,
    `bulan` INTEGER NULL,
    `nominal` DECIMAL(12, 2) NOT NULL,
    `diskon` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS', 'DIBATALKAN') NOT NULL DEFAULT 'BELUM_BAYAR',

    INDEX `tagihan_id_anak_idx`(`id_anak`),
    PRIMARY KEY (`id_tagihan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rekening_tabungan` (
    `id_tabungan` VARCHAR(191) NOT NULL,
    `id_anak` VARCHAR(191) NOT NULL,
    `saldo` DECIMAL(12, 2) NOT NULL DEFAULT 0,

    UNIQUE INDEX `rekening_tabungan_id_anak_key`(`id_anak`),
    PRIMARY KEY (`id_tabungan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaksi_tabungan` (
    `id_transaksi` VARCHAR(191) NOT NULL,
    `id_tabungan` VARCHAR(191) NOT NULL,
    `jenis` ENUM('SETOR', 'TARIK', 'BAYAR_SPP') NOT NULL,
    `nominal` DECIMAL(12, 2) NOT NULL,
    `bukti` TEXT NULL,
    `dicatat_oleh` VARCHAR(191) NULL,

    INDEX `transaksi_tabungan_id_tabungan_idx`(`id_tabungan`),
    PRIMARY KEY (`id_transaksi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pembayaran` (
    `id_pembayaran` VARCHAR(191) NOT NULL,
    `id_tagihan` VARCHAR(191) NOT NULL,
    `metode` ENUM('TRANSFER', 'TUNAI', 'TABUNGAN') NOT NULL,
    `bukti_transfer` TEXT NULL,
    `diverifikasi_oleh` VARCHAR(191) NULL,

    INDEX `pembayaran_id_tagihan_idx`(`id_tagihan`),
    PRIMARY KEY (`id_pembayaran`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tema_pembelajaran` (
    `id_tema` VARCHAR(191) NOT NULL,
    `nama_tema` VARCHAR(191) NOT NULL,
    `minggu_ke` INTEGER NOT NULL,

    PRIMARY KEY (`id_tema`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan_mingguan` (
    `id_laporan` VARCHAR(191) NOT NULL,
    `id_anak` VARCHAR(191) NOT NULL,
    `id_tema` VARCHAR(191) NOT NULL,
    `aspek` VARCHAR(191) NOT NULL,
    `catatan_kegiatan` TEXT NOT NULL,

    INDEX `laporan_mingguan_id_anak_idx`(`id_anak`),
    INDEX `laporan_mingguan_id_tema_idx`(`id_tema`),
    PRIMARY KEY (`id_laporan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `berkas_keluarga` ADD CONSTRAINT `berkas_keluarga_id_keluarga_fkey` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga`(`id_keluarga`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_kunjungan` ADD CONSTRAINT `booking_kunjungan_id_keluarga_fkey` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga`(`id_keluarga`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_kunjungan` ADD CONSTRAINT `booking_kunjungan_id_slot_fkey` FOREIGN KEY (`id_slot`) REFERENCES `slot_jadwal`(`id_slot`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anak` ADD CONSTRAINT `anak_id_keluarga_fkey` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga`(`id_keluarga`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `berkas_anak` ADD CONSTRAINT `berkas_anak_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_kelompok_fkey` FOREIGN KEY (`id_kelompok`) REFERENCES `kelompok`(`id_kelompok`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kelompok` ADD CONSTRAINT `riwayat_kelompok_id_tahun_ajaran_fkey` FOREIGN KEY (`id_tahun_ajaran`) REFERENCES `tahun_ajaran`(`id_tahun_ajaran`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tagihan` ADD CONSTRAINT `tagihan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rekening_tabungan` ADD CONSTRAINT `rekening_tabungan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi_tabungan` ADD CONSTRAINT `transaksi_tabungan_id_tabungan_fkey` FOREIGN KEY (`id_tabungan`) REFERENCES `rekening_tabungan`(`id_tabungan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `pembayaran_id_tagihan_fkey` FOREIGN KEY (`id_tagihan`) REFERENCES `tagihan`(`id_tagihan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_mingguan` ADD CONSTRAINT `laporan_mingguan_id_anak_fkey` FOREIGN KEY (`id_anak`) REFERENCES `anak`(`id_anak`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_mingguan` ADD CONSTRAINT `laporan_mingguan_id_tema_fkey` FOREIGN KEY (`id_tema`) REFERENCES `tema_pembelajaran`(`id_tema`) ON DELETE RESTRICT ON UPDATE CASCADE;

