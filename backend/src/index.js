const http = require("http");
const app = require("./app");

const ensureDatabaseExists = require("./prisma/ensureDatabaseExists");
const runPrismaMigrations = require("./prisma/runPrismaMigrations");
const seed = require("./prisma/seed");
const installEnv = require("./envInstaller");
const cryptoEnv = require("./cryptoEnv");

async function startBackend(port = 0) {
  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(port, () => {
      resolve(server);
    });
  });
}

module.exports = {
  startBackend,
  ensureDatabaseExists,
  runPrismaMigrations,
  seed,
  installEnv,
  cryptoEnv,
};