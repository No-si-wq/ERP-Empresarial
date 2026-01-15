const fs = require("fs");

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.warn(".env.production no encontrado:", envPath);
    return {};
  }

  const raw = fs.readFileSync(envPath, "utf-8");
  const env = {};

  raw.split("\n").forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim();
  });

  return env;
}

function applyEnv(envObj) {
  for (const [key, value] of Object.entries(envObj)) {
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

module.exports = {
  loadEnv,
  applyEnv,
};