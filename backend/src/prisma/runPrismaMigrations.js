const { PrismaClient } = require("@prisma/client");

async function verifyPrismaConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no definido");
  }

  console.log("Verificando conexión Prisma…");

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("Conexión Prisma verificada correctamente");
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = verifyPrismaConnection;