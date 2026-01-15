const { PrismaClient } = require("@prisma/client");

async function runPrismaMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no definido");
  }

  console.log("Verificando conexión Prisma…");

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    await prisma.$queryRaw`SELECT 1`;

    console.log("Migraciones Prisma verificadas correctamente");
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = runPrismaMigrations;