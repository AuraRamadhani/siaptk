import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { buatTagihanPendaftaran } from '@/lib/tagihan';

const STAF = ['KEPALA_SEKOLAH', 'BENDAHARA', 'GURU', 'SUPER_ADMIN'];

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

    const conditions: Record<string, unknown>[] = [];

    if (cari) {
      conditions.push({
        OR: [
          { nama: { contains: cari } },
          { nik: { contains: cari } },
          { keluarga: { namaAyah: { contains: cari } } },
          { keluarga: { namaIbu: { contains: cari } } },
        ],
      });
    }

    if (status) {
      // Filter ketat: status adalah satu-satunya sumber kebenaran (enum StatusAnak).
      // Mencampur siswa ber-rombel / berberkas menunggu membuat siswa PENDAFTAR
      // muncul di arsip aktif dan di daftar siswa guru untuk laporan mingguan.
      conditions.push({ status });
    }

    // ?perluVerifikasi=1 -> hanya berkas yang benar-benar menunggu diperiksa:
    // sudah diunggah isinya (akta/foto/kia) dan statusnya belum disetujui.
    // Tanpa ini, menu Verifikasi Berkas menampilkan pendaftar yang belum
    // mengunggah apa pun sehingga tidak ada yang bisa diverifikasi.
    if (new URL(request.url).searchParams.get('perluVerifikasi') === '1') {
      conditions.push({
        berkasAnak: {
          some: {
            statusVerifikasi: { not: 'DIVERIFIKASI' },
            OR: [{ akta: { not: null } }, { foto: { not: null } }, { kia: { not: null } }],
          },
        },
      });
    }

    if (tahunAjaran) {
      conditions.push({
        riwayatKelompok: { some: { idTahunAjaran: tahunAjaran } },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const data = await prisma.anak.findMany({
      where,
      orderBy: { nama: 'asc' },
      include: {
        keluarga: {
          select: {
            idKeluarga: true,
            namaAyah: true,
            namaIbu: true,
            noHp: true,
            email: true,
            alamat: true,
            fileKK: true,
            fileKTP: true,
            berkasKeluarga: true,
          },
        },
        berkasAnak: true,
        rekeningTabungan: true,
        tagihan: true,
        riwayatKelompok: {
          include: { kelompok: true, tahunAjaran: true },
          orderBy: { tahunAjaran: { periode: 'desc' } },
        },
      },
    });

    const tahunAjaranList = await prisma.tahunAjaran.findMany({ orderBy: { periode: 'desc' } });

    return NextResponse.json(
      { success: true, data, tahunAjaranList },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('API Arsip GET Error:', error);
    const msg = error instanceof Error ? error.message : 'Kesalahan server.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
      const adaBerkas = await prisma.berkasAnak.findUnique({ where: { idBerkasAnak: id }, select: { idBerkasAnak: true } });
      if (!adaBerkas) {
        return NextResponse.json({ success: false, error: 'Berkas siswa tidak ditemukan.' }, { status: 404 });
      }

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
      const adaBerkas = await prisma.berkasKeluarga.findUnique({ where: { idBerkasKel: id }, select: { idBerkasKel: true } });
      if (!adaBerkas) {
        return NextResponse.json({ success: false, error: 'Berkas keluarga tidak ditemukan.' }, { status: 404 });
      }
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
