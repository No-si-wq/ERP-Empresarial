const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../data");
const filePath = path.join(dataDir, "scheduled_jobs.json");

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function loadJobsFromDisk() {
    try {
        ensureDataDir();

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "[]", "utf8");
            return [];
        }

        const raw = fs.readFileSync(filePath, "utf8");

        try {
            return JSON.parse(raw);
        } catch {
            console.error("[JobStorage] Archivo JSON corrupto. Reiniciando...");
            fs.writeFileSync(filePath, "[]", "utf8");
            return [];
        }

    } catch (err) {
        console.error("[JobStorage] Error leyendo jobs persistidos:", err);
        return [];
    }
}

function saveJobsToDisk(jobs) {
    try {
        ensureDataDir();
        fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), "utf8");
    } catch (err) {
        console.error("[JobStorage] Error guardando jobs persistidos:", err);
    }
}

module.exports = { loadJobsFromDisk, saveJobsToDisk };