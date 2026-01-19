const { PrismaClient } = require("@prisma/client");

let prisma;

function getPrisma() {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL no definido antes de inicializar PrismaClient"
      );
    }

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    });
  }

  return prisma;
}

module.exports = { getPrisma };