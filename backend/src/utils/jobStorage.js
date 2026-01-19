const fs = require("fs");
const path = require("path");
const { PATHS, ensureAppDirs } = require("../utils/appPaths");

const filePath = path.join(PATHS.jobs, "scheduled_jobs.json");

function loadJobsFromDisk() {
  try {
    ensureAppDirs();

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
    ensureAppDirs();
    fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), "utf8");
  } catch (err) {
    console.error("[JobStorage] Error guardando jobs:", err);
  }
}

module.exports = { loadJobsFromDisk, saveJobsToDisk };