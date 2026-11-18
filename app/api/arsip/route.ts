import { NextResponse } from 'next/server';
import { prisma, KELUARGA_AMAN } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { buatTagihanPendaftaran } from '@/lib/tagihan';

const STAF = ['KEPALA_SEKOLAH', 'BENDAHARA', 'GURU'];

// GET /api/arsip?cari=...&tahunAjaran=...&status=...
// Pencarian arsip siswa berdasarkan nama, NIK, tahun ajaran.
export async function GET(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !STAF.includes(sesi.peran)) {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cari = searchParams.get('cari')?.trim();
    const tahunAjaran = searchParams.get('tahunAjaran');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (cari) {
      where.OR = [
        { nama: { contains: cari } },
        { nik: { contains: cari } },
        { keluarga: { namaAyah: { contains: cari } } },
        { keluarga: { namaIbu: { contains: cari } } },
      ];
    }

    if (status && ['AKTIF', 'PENDAFTAR'].includes(status)) {
      where.status = status;
    }

    if (tahunAjaran) {
      where.riwayatKelompok = { some: { idTahunAjaran: tahunAjaran } };
    }

    const data = await prisma.anak.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        keluarga: {
          select: {
            ...KELUARGA_AMAN,
            berkasKeluarga: true,
          },
        },
        berkasAnak: true,
        riwayatKelompok: {
          include: { kelompok: true, tahunAjaran: true },
          orderBy: { tahunAjaran: { periode: 'desc' } },
        },
      },
    });

    const tahunAjaranList = await prisma.tahunAjaran.findMany({ orderBy: { periode: 'desc' } });

    return NextResponse.json({ success: true, data, tahunAjaranList });
  } catch (error) {
    console.error('API Arsip GET Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}

// PATCH /api/arsip -> verifikasi berkas anak/keluarga (KEPALA_SEKOLAH only)
export async function PATCH(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== 'KEPALA_SEKOLAH') {
      return NextResponse.json({ success: false, error: 'Peran tidak berwenang.' }, { status: 403 });
    }

    const { tipe, id, status, catatanPenolakan } = await request.json();
    const valid = ['MENUNGGU', 'DIVERIFIKASI', 'DITOLAK'];
    if (!tipe || !id || !valid.includes(status)) {
      return NextResponse.json(
        { success: false, error: `tipe (anak|keluarga), id, dan status (${valid.join('|')}) wajib diisi.` },
        { status: 400 }
      );
    }
    if (status === 'DITOLAK' && !catatanPenolakan?.trim()) {
      return NextResponse.json({ success: false, error: 'Alasan penolakan berkas wajib diisi.' }, { status: 400 });
    }

    if (tipe === 'anak') {
      const updatedBerkas = await prisma.berkasAnak.update({
        where: { idBerkasAnak: id },
        data: { statusVerifikasi: status },
        include: { anak: true },
      });

      // Jika berkas disetujui oleh Kepala Sekolah, terbitkan tagihan biaya pendaftaran & notifikasi
      if (status === 'DIVERIFIKASI' && updatedBerkas.anak) {
        await buatTagihanPendaftaran(prisma, updatedBerkas.anak.idAnak);
        try {
          await prisma.notifikasi.create({
            data: {
              idKeluarga: updatedBerkas.anak.idKeluarga,
              tipe: 'TAGIHAN_BARU',
              judul: 'Berkas Pendaftaran Disetujui Kepala Sekolah',
              pesan: `Alhamdulillah! Berkas pendaftaran untuk ${updatedBerkas.anak.nama} telah disetujui oleh Kepala Sekolah. Tagihan biaya pendaftaran telah diterbitkan, silakan melakukan pembayaran.`,
              dataReferensi: JSON.stringify({ jenis: 'PENDAFTARAN', idAnak: updatedBerkas.anak.idAnak }),
            },
          });
        } catch (e) {
          console.error('Gagal membuat notifikasi arsip:', e);
        }
      } else if (status === 'DITOLAK' && updatedBerkas.anak) {
        try {
          if (catatanPenolakan) {
            await prisma.anak.update({
              where: { idAnak: updatedBerkas.anak.idAnak },
              data: { alasanPenolakan: catatanPenolakan.trim() },
            });
          }
          await prisma.notifikasi.create({
            data: {
              idKeluarga: updatedBerkas.anak.idKeluarga,
              tipe: 'ANAK_DITOLAK',
              judul: 'Berkas Pendaftaran Ditolak Kepala Sekolah',
              pesan: `Berkas pendaftaran untuk ${updatedBerkas.anak.nama} ditolak oleh Kepala Sekolah.${catatanPenolakan ? ` Alasan: ${catatanPenolakan.trim()}.` : ''} Silakan lengkapi atau perbaiki berkas pendaftaran Anda.`,
              dataReferensi: JSON.stringify({ jenis: 'BERKAS_DITOLAK', idAnak: updatedBerkas.anak.idAnak, alasan: catatanPenolakan || '' }),
            },
          });
        } catch (e) {
          console.error('Gagal membuat notifikasi tolak arsip:', e);
        }
      }
    } else if (tipe === 'keluarga') {
      await prisma.berkasKeluarga.update({ where: { idBerkasKel: id }, data: { statusVerifikasi: status } });
    } else {
      return NextResponse.json({ success: false, error: 'tipe harus anak atau keluarga.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Status berkas diperbarui.' });
  } catch (error) {
    console.error('API Arsip PATCH Error:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan server.' }, { status: 500 });
  }
}
