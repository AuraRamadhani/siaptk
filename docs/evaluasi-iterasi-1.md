# Dokumen Evaluasi Prototipe Iterasi 1 (DEV-08 / SCRUM-165)

Sistem Informasi Akademik dan Keuangan Terpadu — TK Islam Nur Habib (SIAP TK)
Tanggal: 30 Oktober 2026
Penulis: Thomas Putra Setiawan (102042300186) — Tim Pengembang

---

## 1. Ringkasan Hasil Pengujian Fungsional (DEV-07)

Pengujian fungsional dijalankan otomatis via `tests/functional.mjs` terhadap server Next.js dan basis data MySQL (`siaptk`):

| Kode | Skenario Uji | Status | Catatan Konsistensi |
|---|---|:---:|---|
| TC-01 | Dashboard Kepala Sekolah mengembalikan KPI | **LULUS** | Metrik siswa, keuangan, arus bulanan, dan per jenis konsisten dengan DB. |
| TC-02 | Daftar rekening tabungan dan saldo | **LULUS** | Seluruh saldo bertipe numerik valid (`Decimal` di-cast `Number`). |
| TC-03 | Pengajuan setoran transfer berstatus MENUNGGU | **LULUS** | Transaksi masuk antrean verifikasi, saldo siswa belum bertambah. |
| TC-04 | Validasi input nominal negatif / nol | **LULUS** | Ditolak HTTP 400 sebelum masuk transaksi database. |
| TC-05 | Verifikasi setoran oleh bendahara | **LULUS** | Status berubah `DIVERIFIKASI`, saldo rekening bertambah persis nominal. |
| TC-06 | Idempotensi verifikasi ganda | **LULUS** | Menghasilkan HTTP 409 Conflict, mencegah penggelembungan saldo. |
| TC-07 | Validasi penarikan melebihi saldo | **LULUS** | Ditolak HTTP 422 Unprocessable Entity, saldo terlindungi dari defisit. |
| TC-08 | Setoran tunai langsung sah di loket | **LULUS** | Masuk langsung `DIVERIFIKASI` dan saldo bertambah instan. |
| TC-09 | Daftar pendaftar dan penetapan penerimaan | **LULUS** | Status anak bertransisi `PENDAFTAR` ↔ `AKTIF`, rekening dibuat otomatis. |
| TC-10 | Integrasi Portal Orang Tua & riwayat mutasi | **LULUS** | Mutasi setoran/tarik tampil lengkap beserta status verifikasi. |
| TC-11 | Rekonsiliasi keuangan sistem | **LULUS** | Total saldo di dashboard sama persis dengan agregasi saldo per rekening. |

Tingkat Kelulusan: **11/11 (100%)**.

---

## 2. Temuan dan Penanganan Selama Pengembangan

1. **Kompatibilitas Tipe Next.js 16 (`app/layout.tsx`)**
   - *Temuan*: Impor `LayoutProps` dari `'next'` memicu galat kompilasi TypeScript (`error TS2614`).
   - *Solusi*: Menggunakan tipe standar `{ children: React.ReactNode }`. Build produksi Next.js kini lulus bersih.

2. **Perluasan Skema `TransaksiTabungan`**
   - *Temuan*: Model tabel awal belum memiliki kolom `status`, `metode`, `idTagihan`, dan `createdAt`, sehingga alur verifikasi bendahara dan pembayaran SPP via tabungan belum memiliki audit trail.
   - *Solusi*: Ditambahkan field `status` (`StatusVerifikasi @default(MENUNGGU)`), `metode` (`MetodePembayaran`), `idTagihan`, dan indeks komposit `[status, createdAt]` pada Prisma schema.

3. **Integritas Mutasi Finansial (ACID)**
   - *Temuan*: Pembaruan saldo dan status transaksi berpotensi inkonsisten bila salah satu operasi gagal.
   - *Solusi*: Seluruh alur perubahan status dan mutasi saldo dibungkus ke dalam `prisma.$transaction`.

---

## 3. Klasifikasi Daftar Perbaikan dan Rekomendasi (Sprint Backlog)

### Prioritas Tinggi (High / FIN-01)
- [ ] **Otentikasi & Otorisasi RBAC Penuh**: Saat ini peran berpindah via UI switcher untuk keperluan prototipe. Integrasikan session NextAuth / JWT terikat dengan tabel `AkunPengguna` agar akses ke endpoint mutasi diverifikasi pada layer middleware.
- [ ] **Kunci Idempotensi Mutasi Finansial**: Tambahkan UUID unik dari klien untuk mencegah `double submit` pada jaringan lambat.

### Prioritas Sedang (Medium / FIN-02)
- [ ] **Unggah Bukti Transfer**: Integrasikan multipart form upload (bukti transfer setoran tabungan) ke penyimpanan berkas lokal/cloud.
- [ ] **Notifikasi Multi-Saluran**: Notifikasi otomatis (WhatsApp gateway / Email) kepada orang tua saat setoran tabungan telah disetujui oleh bendahara.

### Prioritas Rendah (Low / TEST-08)
- [ ] **Ekspor Laporan (PDF / Excel)**: Ekspor rekonsiliasi mingguan bendahara dan laporan realisasi penerimaan kepala sekolah ke format cetak.
- [ ] **Responsivitas Tabel di Layar Kecil**: Tampilan horizontal scroll pada tabel mutasi tabungan di gawai ponsel cerdas.

---

## 4. Kesimpulan

Prototipe Iterasi 1 telah memenuhi seluruh kriteria fungsional untuk modul Tabungan Siswa (DEV-10) dan Dashboard Kepala Sekolah (DEV-12). Hasil pengujian mengonfirmasi konsistensi data antara database relasional MySQL dan antarmuka pengguna Next.js. Siap dilanjutkan ke tahapan User Acceptance Test (UAT) dan Black-Box Testing (TEST-05 & TEST-06).
