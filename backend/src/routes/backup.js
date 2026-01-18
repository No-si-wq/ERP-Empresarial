const express = require("express");
const cron = require("node-cron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { CronExpressionParser } = require("cron-parser");
const stream = require("stream");
const which = require("which");

const router = express.Router();

const scheduledJobs = {};
const { loadJobsFromDisk, saveJobsToDisk } = require("../utils/jobStorage");
let persistedJobs = loadJobsFromDisk();

const BACKUP_DIR = path.resolve(__dirname, "../../backups");
const BACKUP_RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 10);
const DB_CONFIG = {
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
};

function normalizeMode(mode) {
  if (!mode) return "full";
  const m = String(mode).toLowerCase();
  if (m === "data" || m === "data-only") return "data-only";
  if (m === "schema" || m === "schema-only") return "schema-only";
  return "full";
}

function cleanOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();

  files.forEach((file) => {
    const filePath = path.join(BACKUP_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      const ageMs = now - stats.mtimeMs;
      const maxAgeMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[RETENTION] Backup eliminado por antigüedad: ${file}`);
      }
    } catch (err) {
      console.error("[RETENTION] Error revisando backup:", file, err);
    }
  });
}

function recreateCronJob(jobData, DB_CONFIG) {
  const { schedule, mode: rawMode, jobId, password } = jobData;
  if (!cron.validate(schedule)) return;

  if (scheduledJobs[jobId]) {
    try { scheduledJobs[jobId].stop(); } catch (e) {}
    delete scheduledJobs[jobId];
  }

  const mode = normalizeMode(rawMode);

  const job = cron.schedule(schedule, () => {
    const timestamp = new Date().toISOString().replace(/:/g, "-").slice(0, 19);
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const filename = `backup_${mode}_${timestamp}.backup${password ? ".enc" : ""}`;
    const filePath = path.join(BACKUP_DIR, filename);

    const dumpArgs = ["-U", DB_CONFIG.DB_USER, "-h", DB_CONFIG.DB_HOST, "-p", DB_CONFIG.DB_PORT, "-F", "c"];
    if (mode === "data-only") dumpArgs.push("--data-only");
    if (mode === "schema-only") dumpArgs.push("--schema-only");
    dumpArgs.push(DB_CONFIG.DB_NAME);

    const dump = spawn("pg_dump", dumpArgs, { env: { ...process.env, PGPASSWORD: DB_CONFIG.DB_PASSWORD } });

    dump.on("error", (err) => console.error(`[CRON] pg_dump error job ${jobId}:`, err));

    let writeStream;
    if (password) {
      try {
        const iv = crypto.randomBytes(16);
        const key = crypto.createHash("sha256").update(password).digest();
        writeStream = fs.createWriteStream(filePath);
        writeStream.write(iv);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        dump.stdout.pipe(cipher).pipe(writeStream);
      } catch (err) {
        console.error(`[CRON] Error cifrando backup job ${jobId}:`, err);
      }
    } else {
      writeStream = fs.createWriteStream(filePath);
      dump.stdout.pipe(writeStream);
    }

    dump.stderr.on("data", (data) => console.error(`[CRON][pg_dump ${jobId}]`, data.toString()));

    if (writeStream) {
      writeStream.on("finish", () => {
        console.log(`[CRON] Backup generado: ${filePath}`);
        try { cleanOldBackups(); } catch (err) { console.error("[CRON] Error limpieza backups antiguos:", err); }
      });
    }
  });

  job.start();

  job.jobId = jobId;
  job.schedule = schedule;
  job.mode = mode;
  job.password = password;
  scheduledJobs[jobId] = job;
}

persistedJobs.forEach((job) => {
  try { recreateCronJob(job, DB_CONFIG); } catch (err) { console.error("[CRON] Error restaurando job:", err); }
});

router.get("/backup", async (req, res) => {
  let { filename, password, mode } = req.query;

  try {
    if (!filename || filename.trim() === "") filename = "respaldo";

    filename = path.resolve(filename);

    const ext = password ? ".backup.enc" : ".backup";
    if (!filename.endsWith(ext)) {
      filename = filename.replace(/\.[^/.]+$/, "") + ext;
    }

    const projectRoot = path.resolve(__dirname, "..");
    const rel = path.relative(projectRoot, filename);

    const isInsideProject =
      rel && !rel.startsWith("..") && !path.isAbsolute(rel);

    if (isInsideProject) {
      console.error(`[backup] Intento de guardar dentro del proyecto: ${filename}`);
      return res.status(400).send("No puedes guardar el respaldo dentro de la carpeta del proyecto.");
    }

    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let pgDumpPath;
    try {
      pgDumpPath = which.sync("pg_dump");
    } catch (err) {
      console.error("[backup] pg_dump no encontrado:", err);
      return res.status(500).send("pg_dump no se encuentra en el sistema");
    }

    const normMode = normalizeMode(mode);
    const dumpArgs = [
      "-U", DB_CONFIG.DB_USER,
      "-h", DB_CONFIG.DB_HOST,
      "-p", DB_CONFIG.DB_PORT,
      "-F", "c",
      DB_CONFIG.DB_NAME
    ];
    if (normMode === "data-only") dumpArgs.push("--data-only");
    if (normMode === "schema-only") dumpArgs.push("--schema-only");

    const dump = spawn(pgDumpPath, dumpArgs, {
      env: { ...process.env, PGPASSWORD: DB_CONFIG.DB_PASSWORD },
    });

    let stderrData = "";
    let completed = false;
    let killed = false;

    dump.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
      console.error("[backup][stderr]", chunk.toString());
    });

    dump.on("error", (err) => {
      console.error("[backup] error ejecutando pg_dump:", err);
      if (!res.headersSent) res.status(500).send("Error ejecutando pg_dump");
    });

    req.on("close", () => {
      if (!completed) {
        console.log("[backup] conexión cerrada por cliente, abortando pg_dump");
        killed = true;
        dump.kill("SIGTERM");
      }
    });

    let backupStream = dump.stdout;

    if (password) {
      const iv = crypto.randomBytes(16);
      const key = crypto.createHash("sha256").update(password).digest();
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

      backupStream = stream.Readable.from((async function* () {
        yield iv;
        for await (const chunk of dump.stdout) {
          yield cipher.update(chunk);
        }
        yield cipher.final();
      })());
    }

    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filename)}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    let totalBytes = 0;
    backupStream.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (req.app?.get("io")) {
        req.app.get("io").emit("backup-progress", { bytes: totalBytes });
      }
    });

    backupStream.pipe(res);

    dump.on("close", (code, signal) => {
      completed = true;

      if (killed) {
        console.log("[backup] pg_dump fue terminado porque el cliente cerró la conexión");
        return;
      }

      if (code !== 0) {
        console.error(`[backup] pg_dump falló. code=${code}, signal=${signal}`);
        console.error("[backup] stderr completo:", stderrData);
        if (!res.headersSent) res.status(500).send(`pg_dump falló con código ${code}`);
        return;
      }

      console.log("[backup] Backup generado con éxito");
      if (!res.writableEnded) res.end();
    });

  } catch (err) {
    console.error("[backup] Error inesperado:", err);
    if (!res.headersSent) res.status(500).send("Error inesperado generando backup");
  }
});

router.post("/restore", async (req, res) => {
  try {
    const { password, filePath, verifyOnly } = req.body;
    if (!filePath) return res.status(400).send("Archivo no proporcionado");
    if (!fs.existsSync(filePath)) return res.status(400).send("Archivo no existe");

    let inputStream = fs.createReadStream(filePath);

    if (password) {
      let iv = null;
      const transform = new stream.Transform({
        transform(chunk, encoding, callback) {
          try {
            if (!iv) {
              if (chunk.length < 16) return callback(new Error("Archivo corrupto"));
              iv = chunk.subarray(0, 16);
              const key = crypto.createHash("sha256").update(password).digest();
              this.decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
              const rest = chunk.subarray(16);
              if (rest.length > 0) this.push(this.decipher.update(rest));
            } else {
              this.push(this.decipher.update(chunk));
            }
            callback();
          } catch (err) { callback(err); }
        },
        flush(callback) { try { if (this.decipher) this.push(this.decipher.final()); callback(); } catch (err) { callback(err); } }
      });
      inputStream = inputStream.pipe(transform);
    }

    if (verifyOnly) {
      inputStream.on("data", () => {});
      inputStream.on("end", () => res.send({ valid: true, message: "Archivo válido y contraseña correcta" }));
      inputStream.on("error", () => res.status(400).send({ valid: false, message: "Contraseña incorrecta o archivo corrupto" }));
      return;
    }

    const restore = spawn("pg_restore", ["-U", DB_CONFIG.DB_USER, "-h", DB_CONFIG.DB_HOST, "-p", DB_CONFIG.DB_PORT, "-d", DB_CONFIG.DB_NAME, "--clean", "--if-exists", "--no-owner", "--no-privileges"], { env: { ...process.env, PGPASSWORD: DB_CONFIG.DB_PASSWORD } });
    restore.on("error", (err) => { console.error("[restore] spawn error:", err); if (!res.headersSent) res.status(500).send("Error iniciando restauración"); });
    inputStream.pipe(restore.stdin);

    let stderrOutput = "";
    restore.stderr.on("data", (data) => { stderrOutput += data.toString(); console.error("[restore][stderr]", data.toString()); });
    restore.on("close", (code) => {
      if (code === 0) return res.send("Restauración completada correctamente");
      if (stderrOutput.includes("does not exist") || stderrOutput.includes("relation") || stderrOutput.includes("schema"))
        return res.status(500).send("Error: el archivo contiene solo estructura o solo datos. Primero restaura la estructura si es necesario.");
      return res.status(500).send("Error restaurando backup");
    });
  } catch (err) {
    console.error("Restore error:", err);

    const msg =
      err?.response?.data ||
      err?.message ||
      "Error desconocido al restaurar";

    message.error(msg);
  }
});

router.post("/schedule-backup", async (req, res) => {
  try {
    const { schedule, password, options } = req.body;
    if (!schedule || typeof schedule !== "string") return res.status(400).send("Expresión CRON no válida.");
    if (!cron.validate(schedule)) return res.status(400).send("CRON inválido.");

    const mode = normalizeMode(options);
    const validModes = ["full", "data-only", "schema-only"];
    if (!validModes.includes(mode)) return res.status(400).send("Tipo de respaldo inválido.");

    const jobId = crypto.randomUUID();
    recreateCronJob({ jobId, schedule, mode, password }, DB_CONFIG);

    persistedJobs.push({ jobId, schedule, mode, password });
    saveJobsToDisk(persistedJobs);

    try { cleanOldBackups(); } catch (err) { console.error("[schedule-backup] limpieza fallida:", err); }

    res.json({ message: "Respaldo programado correctamente", jobId, schedule, mode });
  } catch (err) {
    console.error("[schedule-backup] error:", err);
    res.status(500).send("Error programando respaldo");
  }
});

router.get("/scheduled-backups", (req, res) => {
  try {
    const jobs = Object.entries(scheduledJobs).map(([jobId, job]) => {
      let nextRun = null;

      try {
        let expr = job.schedule.trim();
        const parts = expr.split(" ");

        if (parts.length === 5) expr = `0 ${expr}`;

        const interval = CronExpressionParser.parse(expr, {
          currentDate: new Date(),
          tz: "UTC",
        });

        nextRun = interval.next().toDate();

      } catch (err) {
        console.error("[CRON] Error parser:", err.message);
        nextRun = null;
      }

      const now = new Date();
      const countdown = nextRun ? nextRun - now : null;

      return {
        jobId,
        schedule: job.schedule,
        mode: job.mode,
        activo: true,
        nextRun: nextRun ? nextRun.toISOString() : null,
        countdown,
      };
    });

    res.send(jobs);
  } catch (err) {
    console.error("[scheduled-backups] error:", err);
    res.status(500).send("Error listando backups programados");
  }
});

router.post("/scheduled-backups/cancel", (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId || !scheduledJobs[jobId]) return res.status(404).send("Job no encontrado");

    scheduledJobs[jobId].stop();
    delete scheduledJobs[jobId];

    persistedJobs = persistedJobs.filter((j) => j.jobId !== jobId);
    saveJobsToDisk(persistedJobs);

    res.send({ message: "Job cancelado correctamente", jobId });
  } catch (err) {
    console.error("[scheduled-backups/cancel] error:", err);
    res.status(500).send("Error cancelando backup programado");
  }
});

module.exports = router;