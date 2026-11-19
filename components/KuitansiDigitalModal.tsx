'use client';

import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { LOGO_NUR_HABIB } from '@/lib/logoNurHabib';

export type DataKuitansi = {
  noKuitansi: string;
  tanggal: string;
  namaSiswa: string;
  kelompok?: string | null;
  namaWali?: string | null;
  jenisPembayaran: string;
  periode?: string | null;
  nominal: number;
  metodePembayaran?: string | null;
  status: 'LUNAS' | string;
  keterangan?: string | null;
};

interface Props {
  data: DataKuitansi | null;
  onClose: () => void;
}

function angkaKeTerbilang(nilai: number): string {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  const n = Math.floor(Math.abs(nilai));
  if (n < 12) return bilangan[n];
  if (n < 20) return `${angkaKeTerbilang(n - 10)} Belas`;
  if (n < 100) return `${angkaKeTerbilang(Math.floor(n / 10))} Puluh ${angkaKeTerbilang(n % 10)}`.trim();
  if (n < 200) return `Seratus ${angkaKeTerbilang(n - 100)}`.trim();
  if (n < 1000) return `${angkaKeTerbilang(Math.floor(n / 100))} Ratus ${angkaKeTerbilang(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${angkaKeTerbilang(n - 1000)}`.trim();
  if (n < 1000000) return `${angkaKeTerbilang(Math.floor(n / 1000))} Ribu ${angkaKeTerbilang(n % 1000)}`.trim();
  if (n < 1000000000) return `${angkaKeTerbilang(Math.floor(n / 1000000))} Juta ${angkaKeTerbilang(n % 1000000)}`.trim();
  return `${angkaKeTerbilang(Math.floor(n / 1000000000))} Miliar ${angkaKeTerbilang(n % 1000000000)}`.trim();
}

export default function KuitansiDigitalModal({ data, onClose }: Props) {
  if (!data) return null;

  // Nama siswa & no kuitansi selalu aman dari undefined/kosong
  const namaSiswaSafe =
    data.namaSiswa && typeof data.namaSiswa === 'string' && data.namaSiswa.trim() !== ''
      ? data.namaSiswa.trim()
      : 'Siswa';

  const noKuitansiSafe =
    data.noKuitansi && typeof data.noKuitansi === 'string' && data.noKuitansi.trim() !== ''
      ? data.noKuitansi.trim()
      : `KWT/${new Date().getFullYear()}/0001`;

  const terbilangStr = `${angkaKeTerbilang(data.nominal || 0)} Rupiah`;
  const tanggalFormat =
    data.tanggal ||
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const unduhAtauCetakPDF = () => {
    // Nama file PDF bersih untuk browser print dialog
    const safeDocTitle = `Kuitansi_${noKuitansiSafe.replace(/[\/\\]/g, '_')}_${namaSiswaSafe.replace(/\s+/g, '_')}`;

    // Membuka window cetak berisolasi tinggi khusus PDF A4
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      // Fallback bila popup diblokir peramban
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>${safeDocTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Times New Roman', Times, Georgia, serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.4;
          }
          .kuitansi-border {
            border: 2px solid #1f2937;
            padding: 24px 28px;
            position: relative;
            background: #ffffff;
          }
          .kop-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 10px;
          }
          .kop-logo {
            width: 82px;
            height: 82px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .kop-text {
            text-align: center;
            flex-grow: 1;
          }
          .kop-yayasan {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #111827;
            margin: 0;
          }
          .kop-sekolah {
            font-size: 21px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #064e3b;
            margin: 2px 0;
          }
          .kop-alamat {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11.5px;
            color: #374151;
            margin: 3px 0 0 0;
            line-height: 1.35;
          }
          .garis-kop {
            margin-top: 8px;
            margin-bottom: 16px;
          }
          .garis-kop-tebal {
            border-bottom: 3px solid #111827;
          }
          .garis-kop-tipis {
            border-bottom: 1px solid #111827;
            margin-top: 2px;
          }
          .judul-wrapper {
            text-align: center;
            margin-bottom: 20px;
          }
          .judul-kuitansi {
            font-size: 16px;
            font-weight: 800;
            text-decoration: underline;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
          }
          .nomor-kuitansi {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            color: #4b5563;
            margin-top: 3px;
          }
          .tabel-isian {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .tabel-isian td {
            padding: 6px 4px;
            vertical-align: top;
            font-size: 13px;
          }
          .label-col {
            width: 190px;
            font-weight: 700;
            color: #1f2937;
          }
          .titik-dua {
            width: 15px;
            text-align: center;
            font-weight: 700;
          }
          .isi-col {
            color: #111827;
          }
          .terbilang-box {
            background-color: #f3f4f6;
            border: 1px dashed #6b7280;
            padding: 8px 12px;
            font-style: italic;
            font-weight: 700;
            color: #1f2937;
            border-radius: 4px;
            display: inline-block;
            width: 95%;
          }
          .nominal-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 18px;
            margin-bottom: 24px;
          }
          .kotak-jumlah {
            border: 2px double #1f2937;
            background: #f9fafb;
            padding: 8px 16px;
            display: inline-block;
          }
          .kotak-jumlah-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            font-family: Arial, Helvetica, sans-serif;
            color: #4b5563;
          }
          .kotak-jumlah-angka {
            font-size: 18px;
            font-weight: 900;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            letter-spacing: 0.5px;
          }
          .tanda-tangan-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 10px;
          }
          .ttd-box {
            text-align: center;
            width: 240px;
          }
          .ttd-kota-tgl {
            font-size: 12px;
            margin-bottom: 4px;
          }
          .ttd-jabatan {
            font-size: 12px;
            font-weight: 700;
          }
          .ttd-area {
            height: 90px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .stempel-cap {
            position: absolute;
            width: 95px;
            height: 95px;
            border: 2px dashed #1e40af;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transform: rotate(-7deg);
            color: #1e40af;
            font-family: Arial, Helvetica, sans-serif;
            text-align: center;
            opacity: 0.85;
            background: rgba(239, 246, 255, 0.35);
          }
          .stempel-teks-top {
            font-size: 7px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .stempel-lunas {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1px;
            border-top: 1.5px solid #1e40af;
            border-bottom: 1.5px solid #1e40af;
            padding: 1px 4px;
            margin: 2px 0;
          }
          .stempel-teks-bot {
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .ttd-nama {
            font-size: 13px;
            font-weight: 800;
            text-decoration: underline;
            margin-top: 4px;
          }
          .ttd-nip {
            font-size: 10px;
            font-family: Arial, Helvetica, sans-serif;
            color: #4b5563;
          }
          .footer-catatan {
            border-top: 1px solid #d1d5db;
            margin-top: 24px;
            padding-top: 8px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.5px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="kuitansi-border">
          <!-- KOP SURAT RESMI DENGAN LOGO RESMI ASLI -->
          <div class="kop-container">
            <img class="kop-logo" src="${LOGO_NUR_HABIB}" alt="Logo TK Islam Nur Habib" />

            <div class="kop-text">
              <h2 class="kop-yayasan">YAYASAN PENDIDIKAN ISLAM NUR HABIB</h2>
              <h1 class="kop-sekolah">TK ISLAM NUR HABIB</h1>
              <p class="kop-alamat">
                Jl. KS. Tubun RT. 03/04 Kel. Pasar Baru, Kec. Karawaci, Kota Tangerang
              </p>
            </div>

            <!-- Stempel Status Lunas -->
            <div style="width: 82px; text-align: right;">
              <span style="display: inline-block; border: 2px solid #059669; color: #059669; font-family: Arial; font-weight: 900; font-size: 11px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                ${data.status}
              </span>
            </div>
          </div>

          <!-- GARIS PEMBATAS KOP GANDA -->
          <div class="garis-kop">
            <div class="garis-kop-tebal"></div>
            <div class="garis-kop-tipis"></div>
          </div>

          <!-- JUDUL KUITANSI -->
          <div class="judul-wrapper">
            <h2 class="judul-kuitansi">KUITANSI PEMBAYARAN</h2>
            <div class="nomor-kuitansi">Nomor : ${noKuitansiSafe}</div>
          </div>

          <!-- TABEL ISIAN KUITANSI -->
          <table class="tabel-isian">
            <tr>
              <td class="label-col">Telah Diterima Dari</td>
              <td class="titik-dua">:</td>
              <td class="isi-col">
                <strong>${data.namaWali || 'Orang Tua / Wali Siswa'}</strong>
              </td>
            </tr>
            <tr>
              <td class="label-col">Nama Peserta Didik</td>
              <td class="titik-dua">:</td>
              <td class="isi-col">
                <strong>${namaSiswaSafe}</strong> ${data.kelompok ? `(Kelompok ${data.kelompok})` : ''}
              </td>
            </tr>
            <tr>
              <td class="label-col">Uang Sejumlah</td>
              <td class="titik-dua">:</td>
              <td class="isi-col">
                <div class="terbilang-box">
                  # ${terbilangStr} #
                </div>
              </td>
            </tr>
            <tr>
              <td class="label-col">Untuk Pembayaran</td>
              <td class="titik-dua">:</td>
              <td class="isi-col">
                <strong>${data.jenisPembayaran}</strong> ${data.periode ? `(${data.periode})` : ''}
                ${data.keterangan ? ` - <em>${data.keterangan}</em>` : ''}
              </td>
            </tr>
            <tr>
              <td class="label-col">Metode Transaksi</td>
              <td class="titik-dua">:</td>
              <td class="isi-col">
                ${data.metodePembayaran || 'Transfer Bank (TF)'}
              </td>
            </tr>
          </table>

          <!-- KOTAK JUMLAH NOMINAL -->
          <div class="nominal-section">
            <div class="kotak-jumlah">
              <div class="kotak-jumlah-label">Jumlah Uang Diterima:</div>
              <div class="kotak-jumlah-angka">Rp ${(data.nominal || 0).toLocaleString('id-ID')},-</div>
            </div>
            <div style="font-family: Arial; font-size: 11px; color: #4b5563; text-align: right;">
              <div>Status: <strong>Telah Diverifikasi Lunas</strong></div>
              <div>Tanggal Bukti: ${tanggalFormat}</div>
            </div>
          </div>

          <!-- TANDA TANGAN PIHAK SEKOLAH & STEMPEL RESMI -->
          <div class="tanda-tangan-wrapper">
            <div class="ttd-box">
              <div class="ttd-kota-tgl">Tangerang, ${tanggalFormat}</div>
              <div class="ttd-jabatan">Bendahara TK Islam Nur Habib,</div>
              <div class="ttd-area">
                <!-- STEMPEL CAP RESMI -->
                <div class="stempel-cap">
                  <span class="stempel-teks-top">YPI NUR HABIB</span>
                  <span class="stempel-lunas">LUNAS</span>
                  <span class="stempel-teks-bot">TK ISLAM TANGERANG</span>
                </div>
                <!-- TANDA TANGAN DIGITAL BENDAHARA -->
                <svg width="120" height="50" viewBox="0 0 140 60" style="position: relative; z-index: 2;">
                  <path d="M 15 40 Q 30 10 50 35 T 80 20 Q 95 45 110 25 T 130 35" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
                  <path d="M 35 30 L 125 32" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="ttd-nama">Siti Rahmawati, S.E.</div>
              <div class="ttd-nip">NIP. 19850712 201001 2 003</div>
            </div>
          </div>

          <!-- FOOTER RESMI -->
          <div class="footer-catatan">
            <span>Lembar 1: Pembayar / Orang Tua Siswa &bull; Lembar 2: Arsip Keuangan Sekolah</span>
            <span>SIAP TK Islam Nur Habib - Dokumen Sah Elektronik</span>
          </div>
        </div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Container Kuitansi Modal */}
      <div className="bg-slate-100 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-300 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        
        {/* Toolbar Aksi Atas */}
        <div className="px-6 py-3.5 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm tracking-wide block">
                Kuitansi Pembayaran Resmi
              </span>
              <span className="text-[11px] text-slate-300">
                TK Islam Nur Habib &bull; {noKuitansiSafe}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={unduhAtauCetakPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF / Cetak</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRATINJAU FISIK KUITANSI (Format Resmi Indonesia) */}
        <div className="p-4 sm:p-8 overflow-x-auto flex justify-center bg-slate-200">
          <div
            className="w-full max-w-2xl bg-white p-7 sm:p-10 shadow-lg border-2 border-slate-800 text-slate-900"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* KOP SURAT RESMI */}
            <div className="flex items-center justify-between gap-4 pb-2">
              {/* Logo Lembaga yang Diupload User */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_NUR_HABIB}
                  alt="Logo TK Islam Nur Habib"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Teks Identitas Lembaga */}
              <div className="text-center flex-1">
                <div className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-900">
                  YAYASAN PENDIDIKAN ISLAM NUR HABIB
                </div>
                <h1 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-emerald-900 my-0.5">
                  TK ISLAM NUR HABIB
                </h1>
                <p className="text-[11.5px] sm:text-xs text-slate-700 leading-tight font-sans">
                  Jl. KS. Tubun RT. 03/04 Kel. Pasar Baru, Kec. Karawaci, Kota Tangerang
                </p>
              </div>

              {/* Badge Status Lunas */}
              <div className="shrink-0 text-right">
                <span className="inline-block border-2 border-emerald-600 text-emerald-700 font-sans font-black text-xs px-2.5 py-1 rounded-sm uppercase tracking-wider">
                  {data.status}
                </span>
              </div>
            </div>

            {/* GARIS KOP SURAT GANDA */}
            <div className="mt-2 mb-5">
              <div className="border-b-[3px] border-slate-900"></div>
              <div className="border-b border-slate-900 mt-0.5"></div>
            </div>

            {/* JUDUL DOKUMEN & NOMOR */}
            <div className="text-center mb-6">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-widest underline decoration-2">
                KUITANSI PEMBAYARAN
              </h2>
              <div className="text-xs sm:text-sm font-bold text-slate-600 font-sans mt-1">
                Nomor : {noKuitansiSafe}
              </div>
            </div>

            {/* TABEL RINCIAN KUITANSI */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-4 font-bold text-slate-800">Telah Diterima Dari</div>
                <div className="col-span-1 text-center font-bold">:</div>
                <div className="col-span-7 font-bold text-slate-900">
                  {data.namaWali || 'Orang Tua / Wali Siswa'}
                </div>
              </div>

              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-4 font-bold text-slate-800">Nama Peserta Didik</div>
                <div className="col-span-1 text-center font-bold">:</div>
                <div className="col-span-7 font-semibold text-slate-900">
                  <strong>{namaSiswaSafe}</strong> {data.kelompok ? `(Kelompok ${data.kelompok})` : ''}
                </div>
              </div>

              <div className="grid grid-cols-12 items-center">
                <div className="col-span-4 font-bold text-slate-800">Uang Sejumlah</div>
                <div className="col-span-1 text-center font-bold">:</div>
                <div className="col-span-7">
                  <div className="bg-slate-100 border border-dashed border-slate-400 px-3 py-1.5 rounded-sm italic font-bold text-slate-800 text-xs sm:text-sm">
                    # {terbilangStr} #
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-4 font-bold text-slate-800">Untuk Pembayaran</div>
                <div className="col-span-1 text-center font-bold">:</div>
                <div className="col-span-7 text-slate-900 font-medium">
                  <strong>{data.jenisPembayaran}</strong> {data.periode ? `(${data.periode})` : ''}
                  {data.keterangan && (
                    <span className="block text-xs text-slate-600 mt-0.5 italic">{data.keterangan}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-4 font-bold text-slate-800">Metode Transaksi</div>
                <div className="col-span-1 text-center font-bold">:</div>
                <div className="col-span-7 text-slate-800">
                  {data.metodePembayaran || 'Transfer Bank (TF)'}
                </div>
              </div>
            </div>

            {/* JUMLAH UANG NOMINAL (KOTAK KHAS KUITANSI) */}
            <div className="my-6 flex items-center justify-between border-t border-b border-slate-200 py-3">
              <div className="border-4 border-double border-slate-800 bg-slate-50 px-4 py-2 inline-block">
                <div className="text-[10px] font-bold text-slate-600 uppercase font-sans">
                  Jumlah :
                </div>
                <div className="text-xl sm:text-2xl font-black font-sans tracking-wide text-slate-900">
                  Rp {(data.nominal || 0).toLocaleString('id-ID')},-
                </div>
              </div>
              <div className="text-right text-[11px] font-sans text-slate-500">
                <div>Status: <span className="text-emerald-700 font-bold uppercase">Terverifikasi Lunas</span></div>
                <div>Tgl: {tanggalFormat}</div>
              </div>
            </div>

            {/* TANDA TANGAN (HANYA BENDAHARA SEKOLAH & STEMPEL) */}
            <div className="flex justify-end pt-2">
              <div className="text-center relative w-56 sm:w-64">
                <div className="text-xs text-slate-700 font-sans">
                  Tangerang, {tanggalFormat}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Bendahara TK Islam Nur Habib,
                </div>
                
                <div className="h-20 relative flex items-center justify-center">
                  {/* Stempel Cap Basah LUNAS */}
                  <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-blue-700 text-blue-700 flex flex-col items-center justify-center rotate-[-8deg] bg-blue-50/40 select-none pointer-events-none">
                    <span className="text-[7px] font-black uppercase tracking-wider font-sans">YPI NUR HABIB</span>
                    <span className="text-xs font-black tracking-widest border-t border-b border-blue-700 px-2 py-0.5 my-0.5 font-sans">LUNAS</span>
                    <span className="text-[7px] font-bold uppercase font-sans">TK ISLAM TANGERANG</span>
                  </div>

                  {/* Coretan Tanda Tangan */}
                  <svg width="110" height="45" viewBox="0 0 140 60" className="relative z-10">
                    <path d="M 15 40 Q 30 10 50 35 T 80 20 Q 95 45 110 25 T 130 35" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M 35 30 L 125 32" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="text-xs sm:text-sm font-bold text-slate-900 underline">
                  Siti Rahmawati, S.E.
                </div>
                <div className="text-[10px] font-sans text-slate-500">
                  NIP. 19850712 201001 2 003
                </div>
              </div>
            </div>

            {/* FOOTER CATATAN RESMI */}
            <div className="border-t border-slate-300 mt-6 pt-2 flex items-center justify-between text-[9px] font-sans text-slate-500">
              <span>Lembar 1: Orang Tua / Pembayar &bull; Lembar 2: Arsip Keuangan Sekolah</span>
              <span>Dokumen Bukti Pembayaran Sah SIAP TK</span>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Klik tombol <strong>Download PDF / Cetak</strong> untuk mencetak atau menyimpan dokumen kuitansi dalam format PDF resmi A4.</span>
          <button
            type="button"
            onClick={unduhAtauCetakPDF}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
        </div>

      </div>
    </div>
  );
}
