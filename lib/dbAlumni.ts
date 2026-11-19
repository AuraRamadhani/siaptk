/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';

let initialized = false;

export async function inisialisasiDatabaseAlumni() {
  if (initialized) return;
  try {
    // 1. Pastikan Database 2 (alumni_siaptk) sudah dibuat di MySQL
    await prisma.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS alumni_siaptk;`);

    // 2. Buat tabel alumni di dalam database alumni_siaptk jika belum ada
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS alumni_siaptk.alumni (
        idAlumni VARCHAR(191) PRIMARY KEY,
        idAnak VARCHAR(191) NOT NULL,
        nama VARCHAR(191) NOT NULL,
        nik VARCHAR(50) NOT NULL,
        tglLahir VARCHAR(50) NOT NULL,
        jenisKelamin VARCHAR(20) NOT NULL,
        namaAyah VARCHAR(191) NULL,
        namaIbu VARCHAR(191) NULL,
        noHp VARCHAR(50) NULL,
        alamat TEXT NULL,
        tahunLulus VARCHAR(50) NOT NULL,
        kelompokTerakhir VARCHAR(50) NOT NULL,
        tglLulus DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        catatan TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // 3. Izinkan status LULUS pada tabel anak di database operasional siaptk
    await prisma.$executeRawUnsafe(`
      ALTER TABLE siaptk.anak MODIFY COLUMN status ENUM('PENDAFTAR', 'AKTIF', 'LULUS') DEFAULT 'PENDAFTAR';
    `).catch(() => {});

    initialized = true;
  } catch (err) {
    console.error('Inisialisasi Database Alumni Error:', err);
  }
}

export type DataAlumni = {
  idAlumni: string;
  idAnak: string;
  nama: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: string;
  namaAyah?: string | null;
  namaIbu?: string | null;
  noHp?: string | null;
  alamat?: string | null;
  tahunLulus: string;
  kelompokTerakhir: string;
  tglLulus: string;
  catatan?: string | null;
  created_at?: string;
};

// Ambil seluruh data alumni dari Database 2 (alumni_siaptk)
export async function ambilDaftarAlumni(): Promise<DataAlumni[]> {
  await inisialisasiDatabaseAlumni();
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        idAlumni, idAnak, nama, nik, tglLahir, jenisKelamin,
        namaAyah, namaIbu, noHp, alamat, tahunLulus, kelompokTerakhir,
        DATE_FORMAT(tglLulus, '%Y-%m-%d %H:%i:%s') as tglLulus,
        catatan,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM alumni_siaptk.alumni
      ORDER BY tglLulus DESC
    `);
    return rows || [];
  } catch (err) {
    console.error('Ambil Alumni Error:', err);
    return [];
  }
}

// Proses kelulusan: Simpan ke Database 2 (alumni_siaptk) dan perbarui status siswa di database utama
export async function luluskanSiswaKeDatabaseAlumni(param: {
  idAnak: string;
  tahunLulus: string;
  catatan?: string;
}) {
  await inisialisasiDatabaseAlumni();

  // 1. Ambil data anak dari database utama (siaptk)
  const anak: any = await prisma.anak.findUnique({
    where: { idAnak: param.idAnak },
    include: {
      keluarga: true,
      riwayatKelompok: {
        include: { kelompok: true },
        take: 1,
      },
    },
  });

  if (!anak) {
    throw new Error('Data siswa tidak ditemukan.');
  }

  // Tentukan kelompok terakhir
  const kelompokTerakhir =
    anak.riwayatKelompok?.[0]?.kelompok?.nama || 'TK B';

  const idAlumni = `ALUMNI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tglLahirStr = anak.tglLahir ? new Date(anak.tglLahir).toISOString().slice(0, 10) : '';

  // 2. Simpan ke Database 2 (alumni_siaptk.alumni)
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO alumni_siaptk.alumni (
        idAlumni, idAnak, nama, nik, tglLahir, jenisKelamin,
        namaAyah, namaIbu, noHp, alamat,
        tahunLulus, kelompokTerakhir, tglLulus, catatan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      ON DUPLICATE KEY UPDATE
        tahunLulus = VALUES(tahunLulus),
        kelompokTerakhir = VALUES(kelompokTerakhir),
        catatan = VALUES(catatan)
    `,
    idAlumni,
    anak.idAnak,
    anak.nama,
    anak.nik,
    tglLahirStr,
    anak.jenisKelamin || 'L',
    anak.keluarga?.namaAyah || null,
    anak.keluarga?.namaIbu || null,
    anak.keluarga?.noHp || null,
    anak.keluarga?.alamat || null,
    param.tahunLulus,
    kelompokTerakhir,
    param.catatan || 'Siswa dinyatakan lulus secara resmi.'
  );

  // 3. Update status siswa di database siaptk menjadi LULUS
  await prisma.$executeRawUnsafe('UPDATE siaptk.anak SET status = "LULUS" WHERE id_anak = ?', param.idAnak);

  return {
    success: true,
    idAlumni,
    nama: anak.nama,
    database: 'alumni_siaptk',
  };
}
