import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaAdapter: PrismaPg | undefined;
};

const connectionString = process.env.DATABASE_URL?.trim();

function createMissingEnvProxy(): PrismaClient {
  const message =
    "DATABASE_URL no esta configurada. Define esta variable para usar Prisma.";

  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error(message);
    },
  });
}

export const prisma: PrismaClient = connectionString
  ? globalForPrisma.prisma ??
  new PrismaClient({
    adapter:
      (globalForPrisma.prismaAdapter ??=
        new PrismaPg({ connectionString })),
  })
  : createMissingEnvProxy();

if (process.env.NODE_ENV !== "production" && connectionString) {
  globalForPrisma.prisma = prisma;
}
