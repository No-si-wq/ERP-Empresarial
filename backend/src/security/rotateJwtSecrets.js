const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { decryptFileToEnv, encryptFile } = require("../cryptoEnv");
const { loadEnv, applyEnv } = require("../env");

const userData =
  process.env.USERDATA_PATH || 
  process.cwd();               

const ENV_PATH = path.join(userData, ".env.production");
const ENC_PATH = `${ENV_PATH}.enc`;

if (!fs.existsSync(ENC_PATH)) {
  console.error("No se encontró .env.production.enc");
  process.exit(1);
}

decryptFileToEnv(ENC_PATH);

const raw = fs.readFileSync(ENV_PATH, "utf8");
const env = loadEnv(raw);

if (!env.JWT_SECRET_CURRENT) {
  console.error("JWT_SECRET_CURRENT no existe");
  process.exit(1);
}

env.JWT_SECRET_PREVIOUS = env.JWT_SECRET_CURRENT;
env.JWT_SECRET_CURRENT = crypto.randomBytes(64).toString("base64");
env.JWT_SECRET_VERSION = String(
  Number(env.JWT_SECRET_VERSION || 1) + 1
);

fs.writeFileSync(ENV_PATH, applyEnv(env), { mode: 0o600 });

encryptFile(ENV_PATH);

console.log("JWT_SECRET rotado correctamente");
console.log("Nueva versión:", env.JWT_SECRET_VERSION);