// Uji fungsional API (DEV-07 iterasi 1) — jalankan: node tests/functional.mjs
// Prasyarat: `npm run dev` jalan di http://localhost:3000 dan DB sudah di-seed.
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let lulus = 0;
const gagal = [];

async function uji(nama, fn) {
  try {
    await fn();
    lulus++;
    console.log(`LULUS  ${nama}`);
  } catch (e) {
    gagal.push({ nama, pesan: e.message });
    console.log(`GAGAL  ${nama} — ${e.message}`);
  }
}

const get = async (path) => {
  const r = await fetch(BASE + path);
  return { status: r.status, body: await r.json() };
};
const kirim = async (path, method, payload) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json() };
};
const saldo = async (idAnak) => Number((await get(`/api/tabungan?idAnak=${idAnak}`)).body.data.saldo);

let rekening = [];
let idAnakAktif;
let idTransaksi;

await uji('TC-01 dashboard kepala sekolah mengembalikan KPI', async () => {
  const { status, body } = await get('/api/dashboard');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  for (const k of ['siswa', 'keuangan', 'bulanIni', 'perJenis']) assert.ok(body.data[k], `field ${k} hilang`);
  assert.equal(typeof body.data.keuangan.totalSaldo, 'number');
});

await uji('TC-02 daftar rekening tabungan + saldo numerik', async () => {
  const { status, body } = await get('/api/tabungan');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data) && body.data.length > 0, 'rekening kosong');
  rekening = body.data;
  idAnakAktif = rekening.find((r) => r.anak.status === 'AKTIF')?.idAnak;
  assert.ok(idAnakAktif, 'tidak ada siswa AKTIF');
  for (const r of rekening) assert.ok(!Number.isNaN(Number(r.saldo)), 'saldo bukan angka');
});

await uji('TC-03 pengajuan setoran transfer masuk antrean, saldo belum berubah', async () => {
  const sebelum = await saldo(idAnakAktif);
  const { status, body } = await kirim('/api/tabungan', 'POST', {
    idAnak: idAnakAktif,
    jenis: 'SETOR',
    metode: 'TRANSFER',
    nominal: 75000,
    keterangan: 'Uji fungsional pengajuan setoran',
  });
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'MENUNGGU');
  idTransaksi = body.data.idTransaksi;
  assert.equal(await saldo(idAnakAktif), sebelum, 'saldo berubah padahal belum diverifikasi');
  const antre = await get('/api/tabungan?status=MENUNGGU');
  assert.ok(antre.body.data.some((t) => t.idTransaksi === idTransaksi), 'transaksi tidak masuk antrean');
});

await uji('TC-04 tolak nominal tidak valid (validasi input)', async () => {
  const { status, body } = await kirim('/api/tabungan', 'POST', { idAnak: idAnakAktif, jenis: 'SETOR', nominal: -5 });
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

await uji('TC-05 verifikasi setoran menambah saldo sesuai nominal', async () => {
  const sebelum = await saldo(idAnakAktif);
  const { status, body } = await kirim('/api/tabungan', 'PATCH', {
    idTransaksi,
    aksi: 'verifikasi',
    diverifikasiOleh: 'Bendahara Uji',
  });
  assert.equal(status, 200);
  assert.equal(body.success, true);
  const sesudah = await saldo(idAnakAktif);
  assert.equal(sesudah, sebelum + 75000, `saldo ${sebelum} → ${sesudah}`);
});

await uji('TC-06 verifikasi ganda ditolak (idempoten)', async () => {
  const { status, body } = await kirim('/api/tabungan', 'PATCH', {
    idTransaksi,
    aksi: 'verifikasi',
    diverifikasiOleh: 'Bendahara Uji',
  });
  assert.equal(status, 409);
  assert.equal(body.success, false);
});

await uji('TC-07 penarikan melebihi saldo ditolak', async () => {
  const { status, body } = await kirim('/api/tabungan', 'POST', {
    idAnak: idAnakAktif,
    jenis: 'TARIK',
    metode: 'TUNAI',
    nominal: 999999999,
  });
  assert.equal(status, 422);
  assert.equal(body.success, false);
});

await uji('TC-08 setoran tunai oleh bendahara langsung sah dan menambah saldo', async () => {
  const sebelum = await saldo(idAnakAktif);
  const { status, body } = await kirim('/api/tabungan', 'POST', {
    idAnak: idAnakAktif,
    jenis: 'SETOR',
    metode: 'TUNAI',
    nominal: 25000,
    keterangan: 'Uji setoran tunai loket',
    dicatatOleh: 'Bendahara Uji',
  });
  assert.equal(status, 200);
  assert.equal(body.data.status, 'DIVERIFIKASI');
  assert.equal(await saldo(idAnakAktif), sebelum + 25000);
});

await uji('TC-09 daftar pendaftar + penetapan penerimaan', async () => {
  const { status, body } = await get('/api/pendaftaran');
  assert.equal(status, 200);
  const idPendaftar = body.data[0]?.idAnak;
  assert.ok(idPendaftar, 'tidak ada pendaftar');
  const terima = await kirim('/api/pendaftaran', 'PATCH', { idAnak: idPendaftar, aksi: 'terima' });
  assert.equal(terima.status, 200);
  assert.equal((await get('/api/pendaftaran')).body.data.length, body.data.length - 1, 'pendaftar tidak berkurang');
  const batal = await kirim('/api/pendaftaran', 'PATCH', { idAnak: idPendaftar, aksi: 'batal' });
  assert.equal(batal.status, 200, 'gagal mengembalikan status ke PENDAFTAR');
});

await uji('TC-10 portal orang tua menerima riwayat tabungan', async () => {
  const { status, body } = await get('/api/keluarga?email=keluarga.pratama@email.com');
  assert.equal(status, 200);
  const berRiwayat = body.data.anak.find((a) => a.rekeningTabungan?.transaksi?.length > 0);
  assert.ok(berRiwayat, 'tidak ada anak dengan riwayat tabungan');
  const t = berRiwayat.rekeningTabungan.transaksi[0];
  for (const k of ['idTransaksi', 'jenis', 'nominal', 'status', 'createdAt']) assert.ok(t[k] !== undefined, `field ${k} hilang`);
});

await uji('TC-11 rekonsiliasi: total saldo dashboard = jumlah saldo rekening', async () => {
  const { body: tab } = await get('/api/tabungan');
  const { body: dash } = await get('/api/dashboard');
  const total = tab.data.reduce((s, r) => s + Number(r.saldo), 0);
  assert.equal(dash.data.keuangan.totalSaldo, total, `dashboard ${dash.data.keuangan.totalSaldo} ≠ rekening ${total}`);
});

console.log(`\nRingkasan: ${lulus} lulus, ${gagal.length} gagal, ${lulus + gagal.length} skenario.`);
if (gagal.length) {
  for (const g of gagal) console.log(` - ${g.nama}: ${g.pesan}`);
  process.exit(1);
}