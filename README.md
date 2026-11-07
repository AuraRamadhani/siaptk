# SIAP TK — TK Islam Nur Habib

Sistem informasi administrasi PAUD/TK: pendaftaran, tagihan SPP, tabungan siswa,
pengelompokan otomatis, jadwal kunjungan, arsip digital, tema & laporan mingguan.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Prisma 7 · MariaDB/MySQL · Tailwind 4

---

## 1. Menjalankan lokal

```bash
npm install
cp .env.example .env          # lalu isi DATABASE_URL + SESSION_SECRET
npx prisma migrate deploy     # buat tabel
node prisma/seed-akun.mjs     # akun staf & contoh keluarga
node prisma/seed-demo.mjs     # data demo (7 keluarga, 14 siswa)
npm run dev                   # http://localhost:3000
```

### Akun demo (kata sandi semua: `123456`)

| Peran | Email |
|---|---|
| Kepala Sekolah | `kepsek@siaptk.sch.id` |
| Guru | `guru@siaptk.sch.id` |
| Bendahara | `bendahara@siaptk.sch.id` |
| Orang Tua | `keluarga.pratama@email.com` |

---

## 2. Peta fitur per peran

### Orang Tua (`/orang-tua`)
- Dashboard ringkasan anak
- **Pesan Kunjungan** — lihat slot tersedia, pesan, pantau status booking
- Tagihan & pembayaran SPP
- Tabungan anak
- Pendaftaran anak baru + unggah berkas (KK, KTP, akta)

### Guru (`/guru`)
- **Laporan Mingguan** — isi aspek perkembangan (sosial/kognitif/motorik/emosi) + catatan
- **Tema Pembelajaran** — kelola tema per minggu

### Bendahara (`/bendahara`)
- Verifikasi pembayaran (satuan & batch)
- Kelola tagihan SPP
- Tabungan siswa (setor/tarik, verifikasi)

### Kepala Sekolah (`/kepala-sekolah`)
- Dashboard KPI
- **Jadwal Kunjungan** — buat slot, lihat & konfirmasi/batalkan booking
- **Pengelompokan** — kelompokkan siswa otomatis berdasarkan usia, keluarkan siswa
- **Arsip Digital** — cari berdasarkan nama/NIK/tahun ajaran, verifikasi berkas
- **Pendaftaran Onsite** — daftarkan keluarga + banyak anak sekaligus

---

## 3. Struktur API

Semua endpoint mengembalikan `{ success, data | error }`.

| Endpoint | Method | Akses |
|---|---|---|
| `/api/auth/masuk`, `/api/auth/keluar`, `/api/auth` | POST | publik / sesi |
| `/api/anak` | GET, PATCH, DELETE | GET: sesi · PATCH: staf · DELETE: kepsek |
| `/api/keluarga` | GET, POST, PATCH | orang tua sendiri / staf |
| `/api/pendaftaran` | GET, PATCH | sesi |
| `/api/pendaftaran/admin` | POST | kepsek |
| `/api/tagihan` | GET, POST | bendahara / orang tua |
| `/api/tagihan/[id]` | GET, PATCH, DELETE | bendahara |
| `/api/tagihan/[id]/bayar` | POST | orang tua |
| `/api/pembayaran/[id]/verifikasi` | PATCH | bendahara |
| `/api/pembayaran/batch` | POST | bendahara |
| `/api/tabungan` | GET, POST, PATCH | bendahara / orang tua |
| `/api/slot-jadwal` | GET, POST, PATCH, DELETE | GET: publik · lainnya: kepsek |
| `/api/booking-kunjungan` | GET, POST, PATCH, DELETE | orang tua / kepsek |
| `/api/pengelompokan` | GET, POST, DELETE | kepsek / guru |
| `/api/tema-pembelajaran` | GET, POST, PATCH, DELETE | guru / kepsek |
| `/api/laporan-mingguan` | GET, POST, PATCH, DELETE | guru |
| `/api/arsip` | GET, PATCH | staf |
| `/api/dashboard` | GET | staf |

Autentikasi: cookie HttpOnly berisi token HMAC-SHA256 (`lib/sesi.ts`), berlaku 7 hari.
Proteksi halaman: `proxy.ts` (middleware). Otorisasi per endpoint dicek di route handler.

---

## 4. Deploy produksi

### 4.1 Siapkan database
MySQL 8 / MariaDB 10.6+. Buat database kosong:
```sql
CREATE DATABASE siaptk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4.2 Environment
```env
DATABASE_URL="mysql://user:password@host:3306/siaptk"
SESSION_SECRET="<64 karakter acak>"
NODE_ENV="production"
```
Generate `SESSION_SECRET`:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 4.3 Build & jalankan
```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm start          # default port 3000
```

### 4.4 Checklist produksi
- [ ] `SESSION_SECRET` diisi acak, **bukan** nilai default
- [ ] `DATABASE_URL` memakai user non-root dengan hak terbatas
- [ ] HTTPS aktif (cookie sesi `secure` — set `NODE_ENV=production`)
- [ ] Folder `public/unggahan` writable oleh proses Node
- [ ] `npx prisma migrate deploy` dijalankan tiap rilis
- [ ] Backup database terjadwal
- [ ] Seed demo **tidak** dijalankan di produksi

### 4.5 Catatan hosting
- **VPS / cPanel Node.js**: `npm run build && npm start`, reverse proxy Nginx ke `:3000`.
- **Vercel**: butuh MySQL yang dapat diakses publik (PlanetScale/Railway/Aiven); SQLite tidak didukung.
- **Docker**: `node:22-alpine`, expose 3000, mount volume untuk `public/unggahan`.

---

## 5. Verifikasi

```bash
npx tsc --noEmit -p tsconfig.json   # type check
npm run build                       # build produksi
npm run lint                        # eslint
node tests/functional.mjs           # 11 skenario end-to-end (butuh server jalan)
```

`tests/functional.mjs` menguji: login 4 peran, proteksi halaman, isolasi data antar
keluarga, CRUD tagihan, dan alur pembayaran.
