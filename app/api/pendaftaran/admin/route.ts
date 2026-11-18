/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { sesiSekarang } from '@/lib/sesi';
import { otomatisKelompokAnak } from '@/lib/kelompok';

const PETUGAS = new Set(['BENDAHARA', 'KEPALA_SEKOLAH', 'SUPER_ADMIN']);

const namaAman = (nama: string) => nama.replace(/[^a-zA-Z0-9._-]/g, '_');

// POST /api/pendaftaran/admin -> input pendaftaran onsite oleh staf (BENDAHARA / KEPALA_SEKOLAH / SUPER_ADMIN)
// Menerima multipart/form-data (dengan upload akta, foto, kia) atau application/json
export async function POST(request: Request) {
  try {
    const sesi = await sesiSekarang();
    if (!sesi || !PETUGAS.has(sesi.peran)) {
      return NextResponse.json(
        { success: false, error: 'Hanya petugas sekolah yang berwenang input pendaftaran.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    mkdirSync(uploadDir, { recursive: true });

    const simpanBerkas = async (f: File | null, awalan: string) => {
      if (!f || typeof f !== 'object' || f.size === 0) return null;
      const namaFile = `${awalan}_${Date.now()}_${namaAman(f.name || 'file')}`;
      await writeFile(path.join(uploadDir, namaFile), Buffer.from(await f.arrayBuffer()));
      return namaFile;
    };

    let namaAyah = '';
    let namaIbu = '';
    let noHp = '';
    let email = '';
    let alamat = '';
    let anakDataList: {
      nama: string;
      nik: string;
      tglLahir: string;
      jenisKelamin: string;
      aktaFilename: string | null;
      fotoFilename: string | null;
      kiaFilename: string | null;
    }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      namaAyah = String(fd.get('namaAyah') || '').trim();
      namaIbu = String(fd.get('namaIbu') || '').trim();
      noHp = String(fd.get('noHp') || '').trim();
      email = String(fd.get('email') || '').trim();
      alamat = String(fd.get('alamat') || '').trim();

      const rawCount = Number(fd.get('anakCount') || 1);
      const anakCount = Math.max(1, Math.min(rawCount, 10));

      for (let i = 0; i < anakCount; i++) {
        const aNama = String(fd.get(`nama_${i}`) || '').trim();
        const aNik = String(fd.get(`nik_${i}`) || '').trim();
        const aTgl = String(fd.get(`tglLahir_${i}`) || '').trim();
        const aJk = (String(fd.get(`jenisKelamin_${i}`) || 'L').toUpperCase() === 'P') ? 'P' : 'L';

        if (aNama || aNik || aTgl) {
          const fileAkta = fd.get(`akta_${i}`) as File | null;
          const fileFoto = fd.get(`foto_${i}`) as File | null;
          const fileKia = fd.get(`kia_${i}`) as File | null;

          const aktaFilename = await simpanBerkas(fileAkta, 'akta');
          const fotoFilename = await simpanBerkas(fileFoto, 'foto');
          const kiaFilename = await simpanBerkas(fileKia, 'kia');

          anakDataList.push({
            nama: aNama,
            nik: aNik,
            tglLahir: aTgl,
            jenisKelamin: aJk,
            aktaFilename,
            fotoFilename,
            kiaFilename,
          });
        }
      }
    } else {
      const body = await request.json();
      namaAyah = String(body.namaAyah || '').trim();
      namaIbu = String(body.namaIbu || '').trim();
      noHp = String(body.noHp || '').trim();
      email = String(body.email || '').trim();
      alamat = String(body.alamat || '').trim();

      const list = Array.isArray(body.anak) ? body.anak : [];
      anakDataList = list.map((a: any) => ({
        nama: String(a.nama || '').trim(),
        nik: String(a.nik || '').trim(),
        tglLahir: String(a.tglLahir || '').trim(),
        jenisKelamin: (String(a.jenisKelamin || 'L').toUpperCase() === 'P') ? 'P' : 'L',
        aktaFilename: a.akta || null,
        fotoFilename: a.foto || null,
        kiaFilename: a.kia || null,
      }));
    }

    if (!noHp || anakDataList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No. HP dan minimal 1 data anak wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi data setiap anak
    for (const a of anakDataList) {
      if (!a.nama || !a.nik || !a.tglLahir) {
        return NextResponse.json(
          { success: false, error: 'Setiap anak wajib memiliki nama lengkap, NIK, dan tanggal lahir.' },
          { status: 400 }
        );
      }
      if (!/^\d{16}$/.test(String(a.nik))) {
        return NextResponse.json(
          { success: false, error: `NIK ${a.nik} tidak valid, harus tepat 16 digit angka.` },
          { status: 400 }
        );
      }
    }

    // Cek NIK duplikat di database
    const nikList = anakDataList.map((a) => a.nik);
    const duplikat = await prisma.anak.findMany({ where: { nik: { in: nikList } } });
    if (duplikat.length > 0) {
      return NextResponse.json(
        { success: false, error: `NIK sudah terdaftar sebelumnya: ${duplikat.map((d) => d.nik).join(', ')}` },
        { status: 409 }
      );
    }

    const hasil = await prisma.$transaction(async (tx) => {
      // Cari atau buat keluarga
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
      for (const a of anakDataList) {
        const baru = await tx.anak.create({
          data: {
            idKeluarga: keluarga.idKeluarga,
            nama: a.nama,
            nik: a.nik,
            tglLahir: new Date(a.tglLahir),
            jenisKelamin: a.jenisKelamin,
            status: 'PENDAFTAR',
            jalurPendaftaran: 'Onsite',
          },
        });

        // Simpan lampiran berkas persyaratan ke tabel berkasAnak
        await tx.berkasAnak.create({
          data: {
            idAnak: baru.idAnak,
            akta: a.aktaFilename,
            foto: a.fotoFilename,
            kia: a.kiaFilename,
            statusVerifikasi: 'MENUNGGU',
          },
        });

        await otomatisKelompokAnak(tx, baru.idAnak, baru.tglLahir);
        anakDibuat.push(baru);
      }

      return { keluarga, anak: anakDibuat };
    });

    return NextResponse.json({
      success: true,
      data: hasil,
      message: `Pendaftaran onsite untuk ${hasil.anak.length} calon siswa berhasil disimpan beserta berkas persyaratannya. Menunggu verifikasi berkas oleh Kepala Sekolah.`,
    });
  } catch (error) {
    console.error('API Pendaftaran Admin POST Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
