const path = require("path");
const fs = require("fs");
const os = require("os");

function getBaseDir() {
  if (process.platform === "win32") {
    return process.env.PROGRAMDATA || "C:\\ProgramData";
  }
  return path.join(os.homedir(), ".o2-system");
}

const APP_DIR = path.join(getBaseDir(), "O2System");

const PATHS = {
  root: APP_DIR,
  env: path.join(APP_DIR, "env"),
  db: path.join(APP_DIR, "db"),
  jobs: path.join(APP_DIR, "jobs"),
  logs: path.join(APP_DIR, "logs"),
  backups: path.join(APP_DIR, "backups"),
  cache: path.join(APP_DIR, "cache"),
};

function ensureAppDirs() {
  for (const dir of Object.values(PATHS)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error(`No se pudo crear el directorio: ${dir}`, err);
      throw err;
    }
  }
}

module.exports = {
  PATHS,
  ensureAppDirs,
};