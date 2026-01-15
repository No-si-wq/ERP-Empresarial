const { ipcRenderer } = require("electron");

module.exports = {
  selectBackupPath(defaultPath = "", password = "") {
    return ipcRenderer.invoke("select-backup-path", {
      defaultPath: String(defaultPath),
      password: String(password),
    });
  },

  saveBackupFile(filePath, data, onProgress) {
    return new Promise((resolve, reject) => {
      let progressHandler;

      if (typeof onProgress === "function") {
        progressHandler = (_, progress) => onProgress(progress);
        ipcRenderer.on("backup-progress", progressHandler);
      }

      ipcRenderer
        .invoke("save-backup-file", {
          filePath: String(filePath || ""),
          data,
        })
        .then((res) => {
          if (progressHandler) {
            ipcRenderer.removeListener("backup-progress", progressHandler);
          }
          resolve(res);
        })
        .catch((err) => {
          if (progressHandler) {
            ipcRenderer.removeListener("backup-progress", progressHandler);
          }
          reject(err);
        });
    });
  },

  selectRestoreFile() {
    return ipcRenderer.invoke("select-restore-file");
  },

  onRestoreProgress(callback) {
    if (typeof callback === "function") {
      ipcRenderer.on("restore-progress", callback);
    }
  },

  offRestoreProgress(callback) {
    if (typeof callback === "function") {
      ipcRenderer.removeListener("restore-progress", callback);
    }
  },
};