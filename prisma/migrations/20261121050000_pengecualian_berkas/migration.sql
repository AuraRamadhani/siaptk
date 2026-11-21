-- Jejak pengecualian berkas: sekolah boleh menerima siswa walau berkas belum
-- diverifikasi, tetapi alasannya wajib tercatat agar bisa ditelusuri pengawas.
ALTER TABLE `anak` ADD COLUMN `pengecualian_berkas` TEXT NULL AFTER `alasan_penolakan`;
