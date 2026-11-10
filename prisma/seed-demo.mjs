// Seed data demo SIAP TK — beberapa keluarga & siswa untuk presentasi.
// Jalankan: node prisma/seed-demo.mjs
// Idempoten: aman dijalankan berulang (cek email/NIK dulu).
import mariadb from 'mariadb';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

const url = new URL(process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/siaptk');
const db = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
});

const hashSandi = (sandi) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(sandi, salt, 64).toString('hex')}`;
};
const SANDI = hashSandi('123456');

// ── Tahun ajaran aktif ────────────────────────────────────────────────
let [tahun] = await db.query('SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status_aktif = 1 LIMIT 1');
if (!tahun) {
  const id = randomUUID();
  await db.query('INSERT INTO tahun_ajaran (id_tahun_ajaran, periode, status_aktif) VALUES (?,?,1)', [id, '2026/2027']);
  tahun = { id_tahun_ajaran: id };
}
const idTahun = tahun.id_tahun_ajaran;

// ── Kelompok (KB 3-4 th, TK A 4-5 th, TK B 5-6 th) ────────────────────
const kelompokTarget = [
  { nama: 'Kelompok Bermain (KB)', usiaMin: 3, usiaMaks: 4 },
  { nama: 'TK A', usiaMin: 4, usiaMaks: 5 },
  { nama: 'TK B', usiaMin: 5, usiaMaks: 6 },
];
const kelompok = {};
for (const k of kelompokTarget) {
  let [ada] = await db.query('SELECT id_kelompok FROM kelompok WHERE nama = ? LIMIT 1', [k.nama]);
  if (!ada) {
    const id = randomUUID();
    await db.query('INSERT INTO kelompok (id_kelompok, nama, usia_min, usia_maks) VALUES (?,?,?,?)', [
      id,
      k.nama,
      k.usiaMin,
      k.usiaMaks,
    ]);
    ada = { id_kelompok: id };
  }
  kelompok[k.nama] = { id: ada.id_kelompok, ...k };
}

// ── Keluarga + anak ──────────────────────────────────────────────────
// tglLahir dipilih agar usia cocok dengan kelompoknya pada 2026.
const keluargaDemo = [
  {
    email: 'keluarga.pratama@email.com',
    namaAyah: 'Budi Pratama',
    namaIbu: 'Siti Rahma',
    noHp: '081200000001',
    alamat: 'Jl. Melati No. 5, Bandung',
    anak: [
      { nama: 'Aisyah Pratama', nik: '3273010101200001', tglLahir: '2020-04-12', jk: 'P', status: 'AKTIF' },
      { nama: 'Yusuf Pratama', nik: '3273010101200002', tglLahir: '2021-08-03', jk: 'L', status: 'PENDAFTAR' },
    ],
  },
  {
    email: 'keluarga.salsa@email.com',
    namaAyah: 'Rahmat Hidayat',
    namaIbu: 'Dewi Lestari',
    noHp: '081200000002',
    alamat: 'Jl. Kenanga No. 12, Bandung',
    anak: [
      { nama: 'Salsa Aura Ramadhani', nik: '3273010101200003', tglLahir: '2020-06-21', jk: 'P', status: 'AKTIF' },
      { nama: 'Salsa Aura Putri', nik: '3273010101200004', tglLahir: '2021-02-14', jk: 'P', status: 'AKTIF' },
    ],
  },
  {
    email: 'keluarga.angga@email.com',
    namaAyah: 'Angga Saputra',
    namaIbu: 'Rina Marlina',
    noHp: '081200000003',
    alamat: 'Jl. Anggrek No. 8, Bandung',
    anak: [
      { nama: 'Angga Wijaya', nik: '3273010101200005', tglLahir: '2020-11-09', jk: 'L', status: 'AKTIF' },
    ],
  },
  {
    email: 'keluarga.nabila@email.com',
    namaAyah: 'Hendra Gunawan',
    namaIbu: 'Nabila Sari',
    noHp: '081200000004',
    alamat: 'Jl. Dahlia No. 3, Bandung',
    anak: [
      { nama: 'Nabila Zahra', nik: '3273010101200006', tglLahir: '2020-03-02', jk: 'P', status: 'AKTIF' },
      { nama: 'Rizky Gunawan', nik: '3273010101200007', tglLahir: '2021-05-18', jk: 'L', status: 'PENDAFTAR' },
    ],
  },
  {
    email: 'keluarga.fathir@email.com',
    namaAyah: 'Fathir Arhaj',
    namaIbu: 'Aminah Zahra',
    noHp: '081200000005',
    alamat: 'Jl. Cempaka No. 21, Bandung',
    anak: [
      { nama: 'Muhammad Fathir Arhaj', nik: '3273010101200008', tglLahir: '2020-09-30', jk: 'L', status: 'AKTIF' },
    ],
  },
  {
    email: 'keluarga.thomas@email.com',
    namaAyah: 'Thomas Putra Setiawan',
    namaIbu: 'Maria Ulfa',
    noHp: '081200000006',
    alamat: 'Jl. Mawar No. 17, Bandung',
    anak: [
      { nama: 'Thomas Alfarizi', nik: '3273010101200009', tglLahir: '2020-01-25', jk: 'L', status: 'AKTIF' },
      { nama: 'Alifa Putri Setiawan', nik: '3273010101200010', tglLahir: '2021-07-11', jk: 'P', status: 'PENDAFTAR' },
    ],
  },
];

const hitungUsia = (iso) => {
  const lahir = new Date(iso);
  const kini = new Date();
  let u = kini.getFullYear() - lahir.getFullYear();
  const b = kini.getMonth() - lahir.getMonth();
  if (b < 0 || (b === 0 && kini.getDate() < lahir.getDate())) u--;
  return u;
};

const statistik = { keluargaBaru: 0, anakBaru: 0, kelompokBaru: 0, tagihanBaru: 0, tabunganBaru: 0 };

for (const k of keluargaDemo) {
  let [kel] = await db.query('SELECT id_keluarga FROM keluarga WHERE email = ? LIMIT 1', [k.email]);
  if (!kel) {
    const id = randomUUID();
    await db.query(
      'INSERT INTO keluarga (id_keluarga, nama_ayah, nama_ibu, no_hp, email, kata_sandi, alamat) VALUES (?,?,?,?,?,?,?)',
      [id, k.namaAyah, k.namaIbu, k.noHp, k.email, SANDI, k.alamat]
    );
    kel = { id_keluarga: id };
    statistik.keluargaBaru++;
  }

  for (const a of k.anak) {
    let [anak] = await db.query('SELECT id_anak FROM anak WHERE nik = ? LIMIT 1', [a.nik]);
    if (!anak) {
      const id = randomUUID();
      await db.query(
        'INSERT INTO anak (id_anak, id_keluarga, nama, nik, tgl_lahir, jenis_kelamin, status, jalur_pendaftaran) VALUES (?,?,?,?,?,?,?,?)',
        [id, kel.id_keluarga, a.nama, a.nik, a.tglLahir, a.jk, a.status, 'Daring']
      );
      anak = { id_anak: id };
      statistik.anakBaru++;
    }

    // Riwayat kelompok untuk siswa AKTIF yang usianya masuk rentang
    const usia = hitungUsia(a.tglLahir);
    const cocok = Object.values(kelompok).find((g) => usia >= g.usiaMin && usia <= g.usiaMaks);
    if (cocok) {
      const [sudah] = await db.query(
        'SELECT id_riwayat FROM riwayat_kelompok WHERE id_anak = ? AND id_tahun_ajaran = ? LIMIT 1',
        [anak.id_anak, idTahun]
      );
      if (!sudah) {
        await db.query(
          'INSERT INTO riwayat_kelompok (id_riwayat, id_anak, id_kelompok, id_tahun_ajaran) VALUES (?,?,?,?)',
          [randomUUID(), anak.id_anak, cocok.id, idTahun]
        );
        statistik.kelompokBaru++;
      }
    }

    // Rekening tabungan untuk siswa AKTIF
    if (a.status === 'AKTIF') {
      let [rek] = await db.query('SELECT id_tabungan FROM rekening_tabungan WHERE id_anak = ? LIMIT 1', [anak.id_anak]);
      if (!rek) {
        const idTab = randomUUID();
        const saldoAwal = 150000 + Math.floor(Math.random() * 6) * 50000;
        await db.query('INSERT INTO rekening_tabungan (id_tabungan, id_anak, saldo) VALUES (?,?,?)', [
          idTab,
          anak.id_anak,
          saldoAwal,
        ]);
        await db.query(
          'INSERT INTO transaksi_tabungan (id_transaksi, id_tabungan, jenis, metode, nominal, keterangan, status, dicatat_oleh, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())',
          [randomUUID(), idTab, 'SETOR', 'TUNAI', saldoAwal, 'Setoran awal', 'DIVERIFIKASI', 'Nurul Hidayah, S.E.']
        );
        statistik.tabunganBaru++;
      }
    }

    // Tagihan SPP bulan berjalan untuk siswa AKTIF
    if (a.status === 'AKTIF') {
      const bulan = new Date().getMonth() + 1;
      const [ada] = await db.query('SELECT id_tagihan FROM tagihan WHERE id_anak = ? AND jenis = ? AND bulan = ? LIMIT 1', [
        anak.id_anak,
        'SPP',
        bulan,
      ]);
      if (!ada) {
        await db.query('INSERT INTO tagihan (id_tagihan, id_anak, jenis, bulan, nominal, diskon, status) VALUES (?,?,?,?,?,?,?)', [
          randomUUID(),
          anak.id_anak,
          'SPP',
          bulan,
          350000,
          0,
          Math.random() > 0.6 ? 'LUNAS' : 'BELUM_BAYAR',
        ]);
        statistik.tagihanBaru++;
      }
    }
  }
}

// ── Tema pembelajaran contoh ─────────────────────────────────────────
const temaContoh = [
  { nama: 'Diriku dan Keluargaku', minggu: 1 },
  { nama: 'Lingkungan Sekitarku', minggu: 2 },
  { nama: 'Binatang di Sekitarku', minggu: 3 },
  { nama: 'Tanaman di Sekolahku', minggu: 4 },
];
for (const t of temaContoh) {
  const [ada] = await db.query('SELECT id_tema FROM tema_pembelajaran WHERE minggu_ke = ? LIMIT 1', [t.minggu]);
  if (!ada) {
    await db.query('INSERT INTO tema_pembelajaran (id_tema, nama_tema, minggu_ke) VALUES (?,?,?)', [
      randomUUID(),
      t.nama,
      t.minggu,
    ]);
  }
}

// ── Slot jadwal kunjungan contoh (7 hari ke depan) ───────────────────
const [adaSlot] = await db.query('SELECT id_slot FROM slot_jadwal LIMIT 1');
if (!adaSlot) {
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    await db.query('INSERT INTO slot_jadwal (id_slot, tanggal, jam, kuota) VALUES (?,?,?,?)', [
      randomUUID(),
      d.toISOString().slice(0, 10),
      '09:00:00',
      5,
    ]);
  }
}

console.log('Seed demo selesai:', statistik);
const [ringkas] = await db.query(`
  SELECT
    (SELECT COUNT(*) FROM keluarga) AS keluarga,
    (SELECT COUNT(*) FROM anak) AS anak,
    (SELECT COUNT(*) FROM anak WHERE status = 'AKTIF') AS aktif,
    (SELECT COUNT(*) FROM riwayat_kelompok) AS riwayat,
    (SELECT COUNT(*) FROM tagihan) AS tagihan,
    (SELECT COUNT(*) FROM rekening_tabungan) AS rekening
`);
console.log('Ringkasan DB:', ringkas);
await db.end();
