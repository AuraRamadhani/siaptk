import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur di file .env");
}

const databaseUrl = new URL(connectionString);

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
  connectionLimit: 5,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

/**
 * Potongan `select` keluarga yang aman dikirim ke klien.
 * Pakai ini setiap kali relasi keluarga ikut di-include dalam respons API —
 * hash kata sandi tidak boleh pernah keluar dari server.
 */
export const KELUARGA_AMAN = {
  idKeluarga: true,
  namaAyah: true,
  namaIbu: true,
  noHp: true,
  email: true,
  alamat: true,
  fileKK: true,
  fileKTP: true,
} as const;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
