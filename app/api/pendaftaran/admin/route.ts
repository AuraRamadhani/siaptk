import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { otomatisKelompokAnak } from '@/lib/kelompok';
import { buatTagihanPendaftaran } from '@/lib/tagihan';

const KEPALA = 'KEPALA_SEKOLAH';

// POST /api/pendaftaran/admin -> input pendaftaran langsung oleh admin (KEPALA_SEKOLAH)
// Body: { namaAyah, namaIbu, noHp, email?, alamat?, anak: [{ nama, nik, tglLahir, jenisKelamin }] }
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || sesi.peran !== KEPALA) {
      return NextResponse.json(
        { success: false, error: 'Hanya kepala sekolah yang dapat input pendaftaran.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { namaAyah, namaIbu, noHp, email, alamat, anak } = body;

    if (!noHp || !Array.isArray(anak) || anak.length === 0) {
      return NextResponse.json(
        { success: false, error: 'noHp dan minimal 1 data anak wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi tiap anak
    for (const a of anak) {
      if (!a.nama || !a.nik || !a.tglLahir) {
        return NextResponse.json(
          { success: false, error: 'Setiap anak wajib punya nama, NIK, dan tanggal lahir.' },
          { status: 400 }
        );
      }
      if (!/^\d{16}$/.test(String(a.nik))) {
        return NextResponse.json(
          { success: false, error: `NIK ${a.nik} tidak valid, harus 16 digit angka.` },
          { status: 400 }
        );
      }
    }

    // Cek NIK duplikat
    const nikList = anak.map((a: { nik: unknown }) => String(a.nik));
    const duplikat = await prisma.anak.findMany({ where: { nik: { in: nikList } } });
    if (duplikat.length > 0) {
      return NextResponse.json(
        { success: false, error: `NIK sudah terdaftar: ${duplikat.map((d) => d.nik).join(', ')}` },
        { status: 409 }
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      // Keluarga: pakai email kalau ada, cek dulu
      let keluarga = email
        ? await tx.keluarga.findUnique({ where: { email: String(email).toLowerCase().trim() } })
        : null;

      if (!keluarga) {
        keluarga = await tx.keluarga.create({
          data: {
            namaAyah: namaAyah || null,
            namaIbu: namaIbu || null,
            noHp: String(noHp).trim(),
            email: email ? String(email).toLowerCase().trim() : null,
            alamat: alamat || null,
          },
        });
      }

      const anakDibuat = [];
      for (const a of anak) {
        const baru = await tx.anak.create({
          data: {
            idKeluarga: keluarga.idKeluarga,
            nama: String(a.nama).trim(),
            nik: String(a.nik),
            tglLahir: new Date(a.tglLahir),
            jenisKelamin: a.jenisKelamin === 'P' ? 'P' : 'L',
            status: 'PENDAFTAR',
            jalurPendaftaran: 'Onsite',
          },
        });
        await otomatisKelompokAnak(tx, baru.idAnak, baru.tglLahir);
        await buatTagihanPendaftaran(tx, baru.idAnak);
        anakDibuat.push(baru);
      }

      return { keluarga, anak: anakDibuat };
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: `${hasil.anak.length} pendaftar berhasil ditambahkan (jalur Onsite).`,
    });
  } catch (error) {
    console.error('API Pendaftaran Admin POST Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Kesalahan server.' }, { status: 500 });
  }
}
