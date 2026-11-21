import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiSekarang } from "@/lib/sesi";

const PETUGAS = new Set(["BENDAHARA", "KEPALA_SEKOLAH"]);

// Helper: kirim notifikasi pembayaran
async function kirimNotifikasiPembayaran(
  tx: any,
  idKeluarga: string,
  namaAnak: string,
  jenisTagihan: string,
  nominal: number,
  status: 'LUNAS' | 'DITOLAK',
  catatan?: string
) {
  const tipe = status === 'LUNAS' ? 'PEMBAYARAN_DIVERIFIKASI' : 'PEMBAYARAN_DITOLAK';
  const judul = status === 'LUNAS' ? 'Pembayaran Diverifikasi (Lunas)' : 'Pembayaran Ditolak';
  const pesan = status === 'LUNAS'
    ? `Pembayaran ${jenisTagihan} sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${namaAnak} telah diverifikasi. Status tagihan: LUNAS.`
    : `Pembayaran ${jenisTagihan} sebesar Rp${nominal.toLocaleString('id-ID')} untuk ${namaAnak} ditolak.${catatan ? ` Alasan: ${catatan}` : ''} Silakan unggah ulang bukti yang benar.`;

  await tx.notifikasi.create({
    data: {
      idKeluarga,
      tipe,
      judul,
      pesan,
      dataReferensi: JSON.stringify({ jenis: 'pembayaran', tagihan: jenisTagihan, nominal, status }),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idPembayaran: string }> }
) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json({ success: false, error: "Hanya bendahara yang dapat memverifikasi." }, { status: 403 });
    }

    const { idPembayaran } = await params;
    const body = await request.json();
    const { aksi, catatanVerifikasi } = body;

    if (!["verifikasi", "tolak"].includes(aksi)) {
      return NextResponse.json({ success: false, error: "aksi harus 'verifikasi' atau 'tolak'" }, { status: 400 });
    }
    if (aksi === "tolak" && !catatanVerifikasi?.trim()) {
      return NextResponse.json({ success: false, error: "Catatan penolakan wajib diisi." }, { status: 400 });
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { idPembayaran },
      include: { tagihan: { include: { anak: true } } },
    });

    if (!pembayaran) {
      return NextResponse.json({ success: false, error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    const idTagihan = pembayaran.idTagihan;
    const namaAnak = pembayaran.tagihan.anak?.nama || 'Anak';
    const idKeluarga = pembayaran.tagihan.anak?.idKeluarga || '';
    const jenisTagihan = pembayaran.tagihan.jenis === 'PENDAFTARAN' ? 'Biaya Pendaftaran' : `SPP Bulan ${pembayaran.tagihan.bulan || '-'}`;
    const nominal = Number(pembayaran.tagihan.nominal) - Number(pembayaran.tagihan.diskon);

    if (aksi === "verifikasi") {
      // Pengaman terakhir: biaya pendaftaran tidak boleh dilunasi bila berkas belum
      // sah dan sekolah tidak mencatat pengecualian. Tanpa ini, siswa bisa menjadi
      // AKTIF padahal berkas persyaratannya tidak pernah diperiksa.
      if (pembayaran.tagihan.jenis === 'PENDAFTARAN') {
        const idAnak = pembayaran.tagihan.idAnak;
        const berkas = await prisma.berkasAnak.findFirst({
          where: { idAnak },
          select: { statusVerifikasi: true },
        });
        const anak = await prisma.anak.findUnique({
          where: { idAnak },
          select: { pengecualianBerkas: true },
        });
        if (berkas?.statusVerifikasi !== 'DIVERIFIKASI' && !anak?.pengecualianBerkas) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Berkas persyaratan belum diverifikasi. Setujui berkas terlebih dahulu, atau kepala sekolah perlu mencatat pengecualian.',
            },
            { status: 409 }
          );
        }
      }

      const [updatedPembayaran] = await prisma.$transaction(async (tx) => {
        const pb = await tx.pembayaran.update({
          where: { idPembayaran },
          data: { diverifikasiOleh: sesi.nama, catatanVerifikasi: catatanVerifikasi || null },
        });
        await tx.tagihan.update({
          where: { idTagihan },
          data: { status: "LUNAS" },
        });
        // Update status anak menjadi AKTIF jika tagihan PENDAFTARAN lunas
        if (pembayaran.tagihan.jenis === 'PENDAFTARAN') {
          await tx.anak.update({
            where: { idAnak: pembayaran.tagihan.idAnak },
            data: { status: 'AKTIF' },
          });
          // Notifikasi anak diterima
          await tx.notifikasi.create({
            data: {
              idKeluarga,
              tipe: 'ANAK_DITERIMA',
              judul: 'Anak Diterima Sebagai Siswa',
              pesan: `Selamat! ${namaAnak} telah resmi diterima sebagai siswa TK Islam Nur Habib.`,
              dataReferensi: JSON.stringify({ idAnak: pembayaran.tagihan.idAnak, status: 'AKTIF' }),
            },
          });
        }
        await kirimNotifikasiPembayaran(tx, idKeluarga, namaAnak, jenisTagihan, nominal, 'LUNAS');
        return [pb];
      });
      return NextResponse.json({ success: true, data: updatedPembayaran });
    } else {
      // tolak
      const [updatedPembayaran] = await prisma.$transaction(async (tx) => {
        const pb = await tx.pembayaran.update({
          where: { idPembayaran },
          data: { buktiTransfer: null, diverifikasiOleh: null, catatanVerifikasi: catatanVerifikasi },
        });
        await tx.tagihan.update({
          where: { idTagihan },
          data: { status: "BELUM_BAYAR" },
        });
        await kirimNotifikasiPembayaran(tx, idKeluarga, namaAnak, jenisTagihan, nominal, 'DITOLAK', catatanVerifikasi);
        return [pb];
      });
      return NextResponse.json({ success: true, data: updatedPembayaran, message: 'Pembayaran ditolak. Orang tua diminta mengunggah ulang bukti yang benar.' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}