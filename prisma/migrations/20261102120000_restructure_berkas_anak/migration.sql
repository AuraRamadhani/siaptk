-- Restructure `berkas_anak`: from one row per document type to a single row per
-- child with a dedicated column for each document (akta, foto, kia).

-- 1. Add the new per-document columns.
ALTER TABLE `berkas_anak`
    ADD COLUMN `akta` VARCHAR(191) NULL,
    ADD COLUMN `foto` VARCHAR(191) NULL,
    ADD COLUMN `kia` VARCHAR(191) NULL;

-- 2. Pivot existing rows: aggregate every document of a child into that
--    child's oldest row (`MIN(id_berkas_anak)`).
UPDATE `berkas_anak` b
JOIN (
    SELECT
        MIN(`id_berkas_anak`) AS `keep_id`,
        `id_anak`,
        MAX(CASE WHEN `jenis` = 'AKTA' THEN `file` END) AS `akta`,
        MAX(CASE WHEN `jenis` = 'PAS_FOTO' THEN `file` END) AS `foto`,
        MAX(CASE WHEN `jenis` = 'KIA' THEN `file` END) AS `kia`
    FROM `berkas_anak`
    GROUP BY `id_anak`
) t ON b.`id_berkas_anak` = t.`keep_id`
SET b.`akta` = t.`akta`,
    b.`foto` = t.`foto`,
    b.`kia` = t.`kia`;

-- 3. Remove the now-redundant duplicate rows (keep only `keep_id` per child).
DELETE b FROM `berkas_anak` b
JOIN (
    SELECT `id_anak`, `keep_id` FROM (
        SELECT
            `id_anak`,
            MIN(`id_berkas_anak`) AS `keep_id`
        FROM `berkas_anak`
        GROUP BY `id_anak`
    ) AS inner_sel
) t ON b.`id_anak` = t.`id_anak`
WHERE b.`id_berkas_anak` <> t.`keep_id`;

-- 4. Enforce one row per child. The UNIQUE index must exist before dropping
--    `berkas_anak_id_anak_idx`, because the foreign key on `id_anak` requires
--    an index and MySQL reuses the unique one.
ALTER TABLE `berkas_anak`
    ADD UNIQUE INDEX `berkas_anak_id_anak_key`(`id_anak`);

-- 5. Drop the obsolete per-file columns and the now-redundant index.
ALTER TABLE `berkas_anak`
    DROP COLUMN `jenis`,
    DROP COLUMN `file`,
    DROP INDEX `berkas_anak_id_anak_idx`;
