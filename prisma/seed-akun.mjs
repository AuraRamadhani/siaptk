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

const sandiDefault = hashSandi('123456');

// 1. Update sandi default untuk keluarga yang belum ada kata_sandi
await db.query('UPDATE keluarga SET kata_sandi = ? WHERE kata_sandi IS NULL OR kata_sandi = ""', [sandiDefault]);

// 2. Akun staf per peran
const staf = [
  { nama: 'Siti Aminah, S.Pd.', email: 'guru@siaptk.sch.id', peran: 'GURU' },
  { nama: 'Nurul Hidayah, S.E.', email: 'bendahara@siaptk.sch.id', peran: 'BENDAHARA' },
  { nama: 'Hj. Mardiah, M.Pd.', email: 'kepsek@siaptk.sch.id', peran: 'KEPALA_SEKOLAH' },
];

for (const s of staf) {
  const [ada] = await db.query('SELECT id_akun FROM akun_staf WHERE email = ?', [s.email]);
  if (ada) {
    await db.query('UPDATE akun_staf SET nama = ?, peran = ?, kata_sandi = ?, aktif = 1 WHERE email = ?', [
      s.nama,
      s.peran,
      sandiDefault,
      s.email,
    ]);
  } else {
    await db.query(
      'INSERT INTO akun_staf (id_akun, nama, email, kata_sandi, peran, aktif, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      [randomUUID(), s.nama, s.email, sandiDefault, s.peran]
    );
  }
}

console.log('Seed akun berhasil diupdate.');
const rows = await db.query('SELECT nama, email, peran FROM akun_staf');
console.log('Daftar akun staf:', rows);
await db.end();