const crypto = require("crypto");
const fs = require("fs");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  return crypto.scryptSync(
    `${process.env.USERNAME}-${process.env.COMPUTERNAME}-O2_SYSTEM`,
    "o2_salt",
    32
  );
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

  decrypted.split("\n").forEach(line => {
    if (!line || line.startsWith("#")) return;
    const [k, ...v] = line.split("=");
    process.env[k.trim()] = v.join("=").trim();
  });
}

module.exports = {
  encryptFile,
  decryptFileToEnv,
};