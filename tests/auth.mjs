// Uji fungsional autentikasi & pembatasan akses per peran (DEV-05 lanjutan).
// Jalankan: node tests/auth.mjs   (butuh `npm run dev` aktif di :3000)
const BASE = process.env.BASE_URL || 'http://localhost:3000';

let lulus = 0;
let gagal = 0;

function cek(nama, kondisi, detail = '') {
  if (kondisi) {
    lulus++;
    console.log(`  LULUS  ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL  ${nama} ${detail}`);
  }
}

async function masuk(peran, email, kataSandi) {
  return fetch(`${BASE}/api/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peran, email, kataSandi }),
    redirect: 'manual',
  });
}

function kukiDari(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const sesi = raw.find((c) => c.startsWith('siaptk_sesi='));
  return sesi ? sesi.split(';')[0] : '';
}

console.log('\n== TC-A1: halaman terproteksi tanpa sesi ==');
{
  const res = await fetch(`${BASE}/bendahara`, { redirect: 'manual' });
  cek('GET /bendahara tanpa sesi diarahkan ke /masuk/bendahara', res.status === 307 && (res.headers.get('location') || '').includes('/masuk/bendahara'), `status=${res.status} loc=${res.headers.get('location')}`);
}

console.log('\n== TC-A2: kata sandi salah ditolak ==');
{
  const res = await masuk('BENDAHARA', 'bendahara@siaptk.sch.id', 'salah-banget');
  cek('POST /api/auth/masuk sandi salah -> 401', res.status === 401, `status=${res.status}`);
}

console.log('\n== TC-A3: peran tidak cocok ditolak ==');
{
  const res = await masuk('KEPALA_SEKOLAH', 'bendahara@siaptk.sch.id', '123456');
  cek('akun bendahara login sebagai kepsek -> 401', res.status === 401, `status=${res.status}`);
}

console.log('\n== TC-A4: login bendahara valid ==');
let kukiBendahara = '';
{
  const res = await masuk('BENDAHARA', 'bendahara@siaptk.sch.id', '123456');
  kukiBendahara = kukiDari(res);
  const body = await res.json();
  cek('login bendahara -> 200 + cookie sesi', res.status === 200 && body.success === true && kukiBendahara.startsWith('siaptk_sesi='), `status=${res.status} kuki=${!!kukiBendahara}`);
}

console.log('\n== TC-A5: akses portal sesuai peran ==');
{
  const resB = await fetch(`${BASE}/bendahara`, { headers: { cookie: kukiBendahara }, redirect: 'manual' });
  const html = await resB.text();
  cek('bendahara dapat membuka /bendahara', resB.status === 200 && html.includes('Portal Bendahara'), `status=${resB.status}`);

  const resK = await fetch(`${BASE}/kepala-sekolah`, { headers: { cookie: kukiBendahara }, redirect: 'manual' });
  cek('bendahara ditolak di /kepala-sekolah (307 -> /bendahara)', resK.status === 307 && (resK.headers.get('location') || '').includes('/bendahara'), `status=${resK.status} loc=${resK.headers.get('location')}`);
}

console.log('\n== TC-A6: login kepala sekolah & orang tua ==');
{
  const res = await masuk('KEPALA_SEKOLAH', 'kepsek@siaptk.sch.id', '123456');
  const kuki = kukiDari(res);
  const html = await (await fetch(`${BASE}/kepala-sekolah`, { headers: { cookie: kuki }, redirect: 'manual' })).text();
  cek('kepsek dapat membuka /kepala-sekolah', res.status === 200 && html.includes('Portal Kepala Sekolah'), `status=${res.status}`);

  const resOrtu = await masuk('ORANG_TUA', 'keluarga.pratama@email.com', '123456');
  const kukiOrtu = kukiDari(resOrtu);
  const htmlOrtu = await (await fetch(`${BASE}/orang-tua`, { headers: { cookie: kukiOrtu }, redirect: 'manual' })).text();
  cek('orang tua dapat membuka /orang-tua', resOrtu.status === 200 && htmlOrtu.includes('SIAP TK'), `status=${resOrtu.status}`);
}

console.log('\n== TC-A7: kuki diubah tidak diterima ==');
{
  const rusak = kukiBendahara.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
  const res = await fetch(`${BASE}/bendahara`, { headers: { cookie: rusak }, redirect: 'manual' });
  cek('signature kuki rusak -> diarahkan ke login', res.status === 307, `status=${res.status}`);
}

console.log('\n== TC-A8: keluar menghapus sesi ==');
{
  const res = await fetch(`${BASE}/api/auth/keluar`, { method: 'POST', headers: { cookie: kukiBendahara } });
  const setKuki = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith('siaptk_sesi=')) || '';
  cek('POST /api/auth/keluar mengosongkan cookie', res.status === 200 && /siaptk_sesi=;|siaptk_sesi=;|max-age=0/i.test(setKuki), `set=${setKuki}`);
}

console.log(`\nRingkasan: ${lulus} LULUS, ${gagal} GAGAL\n`);
process.exit(gagal === 0 ? 0 : 1);