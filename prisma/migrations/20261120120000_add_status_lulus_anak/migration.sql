-- StatusAnak bertambah LULUS: dipakai /api/alumni saat meluluskan siswa.
-- Sebelumnya nilai ini ditulis ke DB walau tidak ada di enum Prisma,
-- sehingga seluruh query yang membaca relasi anak gagal (500).
ALTER TABLE `anak` MODIFY COLUMN `status` ENUM('PENDAFTAR', 'AKTIF', 'LULUS', 'BERHENTI', 'PINDAH') NOT NULL DEFAULT 'PENDAFTAR';
