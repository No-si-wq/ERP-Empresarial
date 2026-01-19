const path = require("path");
const fs = require("fs");

const PROGRAM_DATA =
  process.env.PROGRAMDATA || "C:\\ProgramData";

const APP_DIR = path.join(PROGRAM_DATA, "O2 System");

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
  Object.values(PATHS).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = {
  PATHS,
  ensureAppDirs,
};