const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../data");
const filePath = path.join(dataDir, "scheduled_jobs.json");

function loadJobsFromDisk() {
    try {

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "[]");
            return [];
        }

        const raw = fs.readFileSync(filePath, "utf8");

        try {
            return JSON.parse(raw);
        } catch {
            console.error("[JobStorage] Archivo JSON corrupto. Reiniciando...");
            fs.writeFileSync(filePath, "[]");
            return [];
        }

    } catch (err) {
        console.error("[JobStorage] Error leyendo jobs persistidos:", err);
        return [];
    }
}

function saveJobsToDisk(jobs) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2));
    } catch (err) {
        console.error("[JobStorage] Error guardando jobs persistidos:", err);
    }
}

module.exports = { loadJobsFromDisk, saveJobsToDisk };