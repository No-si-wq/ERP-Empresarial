const http = require("http");
const app = require("./app");

const ensureDatabaseExists = require("./prisma/ensureDatabaseExists");
const runPrismaMigrations = require("./prisma/runPrismaMigrations");
const seed = require("./prisma/seed");
const { loadEnv, applyEnv } = require("./env");
const installEnv = require("./envInstaller");
const cryptoEnv = require("./cryptoEnv");

function startBackend(port = 0) {
  const server = http.createServer(app);

  server.listen(port);

  server.on("listening", () => {
    const actualPort = server.address().port;
    console.log(
      JSON.stringify({
        type: "BACKEND_READY",
        port: actualPort,
      })
    );
  });

  return server;
};

module.exports = {
  startBackend,
  ensureDatabaseExists,
  runPrismaMigrations,
  seed,
  installEnv,
  cryptoEnv,
  env: { applyEnv },
};