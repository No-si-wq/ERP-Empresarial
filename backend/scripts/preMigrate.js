require("dotenv").config();
const ensureDatabaseExists = require("../prisma/ensureDatabaseExists");

(async () => {
  console.log("Verificando base de datos antes de prisma migrate…");

  await ensureDatabaseExists();

  console.log("Listo. Ejecuta prisma migrate.");
  process.exit(0);
})();
