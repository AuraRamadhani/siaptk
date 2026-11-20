-- Status siswa bertambah: BERHENTI (berhenti sekolah) dan PINDAH (pindah sekolah).
-- Keduanya dipakai agar siswa yang keluar tetap tercatat, tidak hilang dari arsip.
ALTER TABLE `anak` MODIFY COLUMN `status` ENUM('PENDAFTAR', 'AKTIF', 'LULUS', 'BERHENTI', 'PINDAH') NOT NULL DEFAULT 'PENDAFTAR';

-- Tanggal acuan hitung usia mengikuti tahun ajaran, bukan konstanta di kode.
-- Kosong berarti memakai acuan bawaan sistem.
ALTER TABLE `tahun_ajaran` ADD COLUMN `tanggal_acuan` DATE NULL AFTER `status_aktif`;
