const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { PATHS, ensureAppDirs } = require("./appPath");

log.transports.file.level = "info";
log.transports.file.resolvePathFn = () => {
  return path.join(app.getPath("userData"), "startup.log");
};

process.on("uncaughtException", (err) => {
  log.error("UNCAUGHT", err);
});

process.on("unhandledRejection", (err) => {
  log.error("REJECTION", err);
});

log.info("App Starting");

const isDev = !app.isPackaged;

let mainWindow = null;
let loadingWindow = null;
let backendServer = null;
let pendingMessages = [];
let backendInfo = null;
let backendProcess;

if (app.isPackaged) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    process.exit(0);
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

function initAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.on("checking-for-update", () => {
    notifyRenderer("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", info => {
    notifyRenderer("update-status", {
      status: "available",
      version: info.version
    });
  });

  autoUpdater.on("update-not-available", () => {
    notifyRenderer("update-status", { status: "none" });
  });

  autoUpdater.on("download-progress", progress => {
    notifyRenderer("update-progress", {
      percent: Math.round(progress.percent),
      speed: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    notifyRenderer("update-status", { status: "downloaded" });
  });

  autoUpdater.on("error", err => {
    notifyRenderer("update-status", {
      status: "error",
      message: err.message
    });
  });
}

function notifyRenderer(channel, payload) {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(channel, payload);
  } else {
    pendingMessages.push({ channel, payload });
  }
}

function getInstallStatePath() {
  return path.join(app.getPath("userData"), "install-state.json");
}

function isSeedAlreadyRun() {
  try {
    const state = JSON.parse(
      fs.readFileSync(getInstallStatePath(), "utf8")
    );
    return state.seedCompleted === true;
  } catch {
    return false;
  }
}

function markSeedAsCompleted() {
  fs.writeFileSync(
    getInstallStatePath(),
    JSON.stringify(
      { 
        seedCompleted: true, 
        completedAt: new Date(), 
        appVersion: app.getVersion(), 
      },
      null, 
      2
    )
  );
}

async function checkBackendHealth(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health`);
    return await res.json();
  } catch {
    return { status: "error", reachable: false };
  }
}


function requireBackendModule() {
  if (app.isPackaged) {
    return require(
      path.join(process.resourcesPath, "backend", "dist", "backend.cjs")
    );
  }

  return require(
    path.join(__dirname, "..", "backend", "src", "index.js")
  );
}

try {
  ensureAppDirs();

  process.env.O2_PATH_ROOT = PATHS.root;
  process.env.O2_PATH_ENV = PATHS.env;
  process.env.O2_PATH_JOBS = PATHS.jobs;
  process.env.O2_PATH_BACKUPS = PATHS.backups;
  process.env.O2_PATH_LOGS = PATHS.logs;

} catch (err) {
  console.error("Error inicializando rutas de aplicación:", err);

  app.quit();
  process.exit(1);
}

const backend = requireBackendModule();

async function startBackend() {
  if (backendServer) return backendServer;

  const envBasePath = path.join(PATHS.env, ".env.production");
  const encEnvPath = `${envBasePath}.enc`;
  const { applyEnv } = backend.env;

  const { decryptFileToEnv } = backend.cryptoEnv;

  if (app.isPackaged) {
    backend.installEnv(envBasePath);

    decryptFileToEnv(encEnvPath);
    applyEnv(process.env);

    if (!process.env.JWT_SECRET_CURRENT) {
      throw new Error("JWT_SECRET_CURRENT no definido en producción");
    }

    notifyRenderer("loader-status", "Preparando base de datos…");
    const newDbUrl = await backend.ensureDatabaseExists();

    if (newDbUrl) {
      process.env.DATABASE_URL = newDbUrl;

      backend.cryptoEnv.persistEnvVariable(
        encEnvPath,
        "DATABASE_URL",
        newDbUrl
      );
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no fue establecido después de ensureDatabaseExists");
    }

    notifyRenderer("loader-status", "Aplicando migraciones…");
    await backend.runPrismaMigrations();

    if (!isSeedAlreadyRun()) {
      notifyRenderer("loader-status", "Cargando datos iniciales…");
      await backend.seed();
      markSeedAsCompleted();
    }
  }

  notifyRenderer("loader-status", "Iniciando servicios…");

  backendServer = backend.startBackend(0);

  await new Promise((resolve, reject) => {
    backendServer.once("listening", resolve);
    backendServer.once("error", reject);
  });

  const address = backendServer.address();
  const port = address?.port;

  notifyRenderer("backend-status", { status: "up" });
  notifyRenderer("backend-ready", { port });

  backendInfo = { port };

  loadingWindow?.close();
  loadingWindow = null;

  mainWindow.show();

  return backendServer;
}

const iconPath = isDev
  ? path.join(__dirname, "../assets/favicon.png")
  : path.join(process.resourcesPath, "assets/favicon.png");

function createLoadingWindow() {
  if (loadingWindow) return;

  loadingWindow = new BrowserWindow({
    width: 420,
    height: 220,
    show: true,
    frame: false,
    resizable: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload", "loader.api.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  loadingWindow.loadURL(
    "data:text/html;charset=utf-8," +
    encodeURIComponent(`
      <body style="display:flex;align-items:center;justify-content:center;font-family:sans-serif">
        <h3 id="status">Iniciando…</h3>
        <script>
          window.loader.onStatus(t => {
            document.getElementById("status").innerText = t;
          });
        </script>
      </body>
    `)
  );
  loadingWindow.once("ready-to-show", () => {
    loadingWindow.show();
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on("did-fail-load", (_, code, desc) => {
    console.error("did-fail-load:", code, desc);
  });

  mainWindow.webContents.on("render-process-gone", (_, details) => {
    console.error("renderer gone:", details);
  });

  if (isDev) {
    const devUrl = "http://localhost:5173";
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(
      process.resourcesPath, "frontend", "dist", "index.html");

    mainWindow.loadFile(indexPath);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.handle("get-backend-info", () => {
  return backendInfo;
});

ipcMain.handle("rotate-jwt-secret", async () => {
  const script = app.isPackaged
    ? path.join(
        process.resourcesPath,
        "backend",
        "src",
        "scripts",
        "rotateJwtSecret.js"
      )
    : path.join(
        __dirname,
        "..",
        "backend",
        "src",
        "scripts",
        "rotateJwtSecret.js"
      );

  await new Promise((resolve, reject) => {
    const child = require("child_process").spawn(
      process.execPath,
      [script],
      {
        env: {
          ...process.env,
          USERDATA_PATH: app.getPath("userData"),
        },
        stdio: "inherit",
      }
    );

    child.on("exit", code =>
      code === 0 ? resolve() : reject(new Error("Rotation failed"))
    );
  });

  return { ok: true };
});

ipcMain.handle("check-backend-health", async () => {
  if (!backendInfo?.port) {
    return { status: "error", message: "Backend no iniciado" };
  }

  return await checkBackendHealth(backendInfo.port);
});

ipcMain.handle("check-for-updates", async () => {
  if (!app.isPackaged) return { dev: true };
  return autoUpdater.checkForUpdates();
});

ipcMain.handle("download-update", async () => {
  return autoUpdater.downloadUpdate();
});

ipcMain.handle("install-update", async () => {
  if (backendInfo?.port) {
    // valida backend estado
  }
  autoUpdater.quitAndInstall();
});

ipcMain.handle("select-backup-path", async (event, { defaultPath, password }) => {
  try {
    const projectRoot = app.isPackaged
      ? path.join(process.resourcesPath, "..")
      : path.resolve(__dirname);

    let baseName = "respaldo";

    if (defaultPath) {
      const parsed = path.parse(defaultPath);
      baseName = parsed.name.replace(/\.(backup|backup\.enc)$/i, "").replace(/_(full|data|schema)$/i, "");
    }

    baseName += password ? ".backup.enc" : ".backup";

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Guardar respaldo de base de datos",
      defaultPath: defaultPath || baseName,
      filters: [{ name: "Backups", extensions: ["backup", "backup.enc"] }]
    });

    if (canceled || !filePath) return null;

    const abs = path.resolve(filePath);
    const rel = path.relative(projectRoot, abs);
    const isInside = rel && !rel.startsWith("..") && !path.isAbsolute(rel);

    if (isInside) {
      dialog.showErrorBox(
        "Ruta no permitida",
        "No puedes guardar el respaldo dentro de la carpeta del proyecto."
      );
      return null;
    }

    return abs;

  } catch (error) {
    console.error("Error en select-backup-path:", error);
    throw error;
  }
});

ipcMain.handle("save-backup-file", async (event, { filePath, data }) => {
  try {
    if (!filePath) throw new Error("Ruta de archivo no válida");

    const abs = path.resolve(filePath);
    const projectRoot = app.isPackaged
      ? path.join(process.resourcesPath, "..")
      : path.resolve(__dirname);

    const rel = path.relative(projectRoot, abs);
    const isInside = rel && !rel.startsWith("..") && !path.isAbsolute(rel);

    if (isInside) {
      return { success: false, error: "No puedes guardar dentro de la carpeta del proyecto." };
    }

    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await fs.promises.writeFile(abs, Buffer.from(data));

    return { success: true };

  } catch (err) {
    console.error("Error guardando backup:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("select-restore-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Selecciona el archivo de respaldo",
    properties: ["openFile"],
    filters: [
      { name: "Backups", extensions: ["backup", "backup.enc"] }
    ],
  });

  return canceled ? null : filePaths[0];
});

app.whenReady().then(() => {
  try {
    createLoadingWindow();

    createMainWindow();

    setImmediate(() => {
      startBackend().catch(err => {
        console.error("Error backend:", err);
        dialog.showErrorBox("Error backend", err.message);
        app.quit();
      });
    });

    if (app.isPackaged) {
      initAutoUpdater();
      autoUpdater.checkForUpdates();
    }

  } catch (err) {
    console.error("Error crítico de arranque:", err);
    dialog.showErrorBox("Error de inicio", err.message);
    app.quit();
  }
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  backendServer?.close();
  if (process.platform !== "darwin") app.quit();
});