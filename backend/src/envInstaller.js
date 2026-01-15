const fs = require("fs");
const crypto = require("crypto");
const { encryptFile } = require("./cryptoEnv");

module.exports = function installEnv(envPath) {
  const encPath = `${envPath}.enc`;

  if (fs.existsSync(encPath)) {
    return false;
  }

  const jwtCurrent = crypto.randomBytes(64).toString("base64");

  const content = [
    "NODE_ENV=production",
    `JWT_SECRET_CURRENT=${jwtCurrent}`,
    "JWT_SECRET_PREVIOUS=",
    "JWT_SECRET_VERSION=1",
    "",
  ].join("\n");

  fs.writeFileSync(envPath, content, { mode: 0o600 });

  encryptFile(envPath);

  console.log(".env.production creado y cifrado correctamente");
  return true;
};