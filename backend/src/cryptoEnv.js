const crypto = require("crypto");
const fs = require("fs");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  const base = [
    process.env.USERNAME,
    process.env.COMPUTERNAME,
    "O2_SYSTEM",
    process.env.APP_ID || "default"
  ].join("|");

  return crypto.scryptSync(base, "o2_salt", 32);
}

function encryptFile(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();

  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  fs.writeFileSync(
    `${filePath}.enc`,
    Buffer.concat([iv, tag, encrypted])
  );

  fs.unlinkSync(filePath);
}

function decryptFileToEnv(encPath) {
  try {
    const buffer = fs.readFileSync(encPath);

    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    decrypted
      .split(/\r?\n/)
      .forEach(line => {
        if (!line || line.trim().startsWith("#")) return;
        const idx = line.indexOf("=");
        if (idx === -1) return;

        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();

        process.env[key] = value;
      });

  } catch (err) {
    throw new Error(
      "No se pudo descifrar .env.production.enc. " +
      "¿El archivo pertenece a otra máquina o usuario?"
    );
  }
}

function persistEnvVariable(encPath, key, value) {
  let env = {};

  if (fs.existsSync(encPath)) {
    decryptFileToEnv(encPath);
    env = { ...process.env };
  }

  env[key] = value;

  const content = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const tempPath = encPath.replace(/\.enc$/, "");

  fs.writeFileSync(tempPath, content, "utf8");
  encryptFile(tempPath);
}

module.exports = cryptoEnv = {
  encryptFile,
  decryptFileToEnv,
  persistEnvVariable,
};