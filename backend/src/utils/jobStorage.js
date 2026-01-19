const fs = require("fs");
const path = require("path");

const jobsDir =
  process.env.O2_PATH_JOBS ||
  path.resolve(process.cwd(), "data/jobs");

const filePath = path.join(jobsDir, "scheduled_jobs.json");

function ensureDir() {
  if (!fs.existsSync(jobsDir)) {
    fs.mkdirSync(jobsDir, { recursive: true });
  }
}

function loadJobsFromDisk() {
  try {
    ensureDir();

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
      return [];
    }

    const raw = fs.readFileSync(filePath, "utf8");

    try {
      return JSON.parse(raw);
    } catch {
      console.error("[JobStorage] JSON corrupto. Reiniciando...");
      fs.writeFileSync(filePath, "[]", "utf8");
      return [];
    }
  } catch (err) {
    console.error("[JobStorage] Error leyendo jobs:", err);
    return [];
  }
}

function saveJobsToDisk(jobs) {
  try {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), "utf8");
  } catch (err) {
    console.error("[JobStorage] Error guardando jobs:", err);
  }
}

module.exports = { loadJobsFromDisk, saveJobsToDisk };