// Seed data awal untuk pengujian fungsional (DEV-07).
// Jalankan: node prisma/seed.mjs
import mariadb from 'mariadb';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/siaptk');
const db = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
});

const EMAIL = 'keluarga.pratama@email.com';

const [ada] = await db.query('select id_keluarga from keluarga where email = ?', [EMAIL]);
if (ada) {
  console.log('Seed dilewati: data keluarga.pratama@email.com sudah ada.');
  await db.end();
  process.exit(0);
}

const idKeluarga = randomUUID();
const idKelompok = randomUUID();
const idTahunAjaran = randomUUID();
const idAnak1 = randomUUID();
const idAnak2 = randomUUID();
const idTabungan1 = randomUUID();
const idTabungan2 = randomUUID();
const idTagihan1 = randomUUID();
const idTagihan2 = randomUUID();

await db.query(
  'insert into keluarga (id_keluarga, nama_ayah, nama_ibu, no_hp, email, alamat) values (?,?,?,?,?,?)',
  [idKeluarga, 'Budi Pratama', 'Siti Rahma', '081200000001', EMAIL, 'Jl. Melati No. 5, Bandung']
);
await db.query('insert into kelompok (id_kelompok, nama, usia_min, usia_maks) values (?,?,?,?)', [
  idKelompok, 'TK B', 5, 6,
]);
await db.query('insert into tahun_ajaran (id_tahun_ajaran, periode, status_aktif) values (?,?,?)', [
  idTahunAjaran, '2026/2027', 1,
]);
await db.query('insert into anak (id_anak, id_keluarga, nama, nik, tgl_lahir, status) values (?,?,?,?,?,?)', [
  idAnak1, idKeluarga, 'Aisyah Pratama', '3273010101200001', '2020-04-12', 'AKTIF',
]);
await db.query('insert into anak (id_anak, id_keluarga, nama, nik, tgl_lahir, status) values (?,?,?,?,?,?)', [
  idAnak2, idKeluarga, 'Yusuf Pratama', '3273010101200002', '2021-08-03', 'PENDAFTAR',
]);
await db.query('insert into riwayat_kelompok (id_riwayat, id_anak, id_kelompok, id_tahun_ajaran) values (?,?,?,?)', [
  randomUUID(), idAnak1, idKelompok, idTahunAjaran,
]);
await db.query('insert into rekening_tabungan (id_tabungan, id_anak, saldo) values (?,?,?)', [idTabungan1, idAnak1, 250000]);
await db.query('insert into rekening_tabungan (id_tabungan, id_anak, saldo) values (?,?,?)', [idTabungan2, idAnak2, 0]);
await db.query('insert into tagihan (id_tagihan, id_anak, jenis, bulan, nominal, diskon, status) values (?,?,?,?,?,?,?)', [
  idTagihan1, idAnak1, 'SPP', 10, 350000, 0, 'BELUM_BAYAR',
]);
await db.query('insert into tagihan (id_tagihan, id_anak, jenis, bulan, nominal, diskon, status) values (?,?,?,?,?,?,?)', [
  idTagihan2, idAnak2, 'PENDAFTARAN', null, 500000, 0, 'BELUM_BAYAR',
]);
await db.query(
  'insert into transaksi_tabungan (id_transaksi, id_tabungan, jenis, metode, nominal, keterangan, status, dicatat_oleh, created_at) values (?,?,?,?,?,?,?,?,now())',
  [randomUUID(), idTabungan1, 'SETOR', 'TUNAI', 250000, 'Setoran awal pendaftaran', 'DIVERIFIKASI', 'Bendahara']
);

console.log('Seeded:', EMAIL, '| siswa:', idAnak1, idAnak2);
await db.end();