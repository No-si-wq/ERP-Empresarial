const fs = require("fs");
const path = require("path");
const morgan = require("morgan");

function createMorganLogger() {
  // DEV: consola
  if (process.env.NODE_ENV !== "production") {
    return morgan("dev");
  }

  const logsDir = process.env.O2_PATH_LOGS;

  if (!logsDir) {
    throw new Error("O2_PATH_LOGS no definido en producción");
  }

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, "access.log"),
    { flags: "a" }
  );

  return morgan("combined", { stream: accessLogStream });
}

module.exports = { createMorganLogger };