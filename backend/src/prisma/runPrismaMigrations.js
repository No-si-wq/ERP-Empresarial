const { execFile } = require("child_process");
const path = require("path");

function runPrismaMigrations() {

  console.log("Ejecutando migraciones Prisma…");

  return new Promise((resolve, reject) => {
    const prismaBin = process.platform === "win32"
      ? "npx.cmd"
      : "npx";

    execFile(
      prismaBin,
      ["prisma", "migrate", "deploy"],
      {
        cwd: path.join(__dirname, ".."),
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return reject(error);
        }

        console.log(stdout);
        console.log("Migraciones Prisma aplicadas correctamente");
        resolve();
      }
    );
  });
}

module.exports = runPrismaMigrations;