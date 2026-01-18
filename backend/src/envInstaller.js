const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { encryptFile } = require("./cryptoEnv");

module.exports = function installEnv(envPath) {
  const encPath = `${envPath}.enc`;

  if (fs.existsSync(encPath)) {
    console.log(".env.production.enc ya existe");
    return false;
  }

  const dir = path.dirname(envPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const jwtCurrent = crypto.randomBytes(64).toString("hex");

  const content = [
    "NODE_ENV=production",
    "",
    "# JWT",
    `JWT_SECRET_CURRENT=${jwtCurrent}`,
    "JWT_SECRET_PREVIOUS=",
    "JWT_SECRET_VERSION=1",
    "",
    "# DB admin",
    "DB_HOST=localhost",
    "DB_PORT=5432",
    "DB_ADMIN_USER=postgres",
    "DB_ADMIN_PASSWORD=mi_contrasenia",
    "NODE_ENV=production",
    "",
    "# DB runtime",
    "DATABASE_URL=",
    "",
  ].join("\n");

  fs.writeFileSync(envPath, content, { mode: 0o600 });

  encryptFile(envPath);

  console.log(".env.production creado y cifrado correctamente");
  return true;
};