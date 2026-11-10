import 'dotenv/config';
import mariadb from 'mariadb';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

function hashSandi(sandi) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(sandi, salt, 64).toString('hex')}`;
}

const url = new URL(process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/siaptk');
const db = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
});

// Pastikan kolom ENUM peran pada akun_staf sudah mencakup SUPER_ADMIN
await db.query(
  "ALTER TABLE akun_staf MODIFY COLUMN peran ENUM('GURU', 'BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN') NOT NULL"
);

const sandiDefault = hashSandi('123456');

// 1. Update sandi default untuk keluarga yang belum ada kata_sandi
await db.query('UPDATE keluarga SET kata_sandi = ? WHERE kata_sandi IS NULL OR kata_sandi = ""', [sandiDefault]);

// 2. Seed 1 akun Super Admin (untuk membuatkan akun Guru, Bendahara, dan Kepala Sekolah)
const superAdmin = {
  nama: 'Super Admin SIAP TK',
  email: 'superadmin@siaptk.sch.id',
  peran: 'SUPER_ADMIN',
};

const [ada] = await db.query('SELECT id_akun FROM akun_staf WHERE email = ?', [superAdmin.email]);
if (ada) {
  await db.query('UPDATE akun_staf SET nama = ?, peran = ?, kata_sandi = ?, aktif = 1 WHERE email = ?', [
    superAdmin.nama,
    superAdmin.peran,
    sandiDefault,
    superAdmin.email,
  ]);
} else {
  await db.query(
    'INSERT INTO akun_staf (id_akun, nama, email, kata_sandi, peran, aktif, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
    [randomUUID(), superAdmin.nama, superAdmin.email, sandiDefault, superAdmin.peran]
  );
}

console.log('Seed Super Admin berhasil:', superAdmin.email, '(kata sandi default: 123456)');
const rows = await db.query('SELECT nama, email, peran, aktif FROM akun_staf');
console.log('Daftar akun staf saat ini:', rows);
await db.end();
