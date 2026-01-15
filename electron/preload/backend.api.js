const { ipcRenderer } = require("electron");

module.exports = {
  onBackendStatus(callback) {
    if (typeof callback === "function") {
      ipcRenderer.on("backend-status", (_, status) => callback(status));
    }
  },

  offBackendStatus(callback) {
    if (typeof callback === "function") {
      ipcRenderer.removeListener("backend-status", callback);
    }
  },

  getBackendInfo: () => ipcRenderer.invoke("get-backend-info"),

  onBackendReady(callback) {
    if (typeof callback === "function") {
      ipcRenderer.on("backend-ready", callback);
    }
  },

  offBackendReady(callback) {
    if (typeof callback === "function") {
      ipcRenderer.removeListener("backend-ready", callback);
    }
  },

  checkBackendHealth: () => ipcRenderer.invoke("check-backend-health"),

  rotateJwtSecret: () => ipcRenderer.invoke("rotate-jwt-secret"),
};