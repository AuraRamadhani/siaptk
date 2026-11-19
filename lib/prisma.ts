import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur di file .env");
}

const databaseUrl = new URL(connectionString);

const PRISMA_VERSION = "2026-11-19-v3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaMariaDb | undefined;
  version: string | undefined;
};

if (globalForPrisma.version !== PRISMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.adapter = undefined;
  globalForPrisma.version = PRISMA_VERSION;
}

const adapter =
  globalForPrisma.adapter ??
  new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, ""),
    connectionLimit: 10,
  });

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
  globalForPrisma.adapter = adapter;
}
