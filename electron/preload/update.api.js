const { ipcRenderer } = require("electron");

module.exports = {
  check: () => ipcRenderer.invoke("check-for-updates"),

  download: () => ipcRenderer.invoke("download-update"),

  install: () => ipcRenderer.invoke("install-update"),
  
  onStatus: cb =>
    ipcRenderer.on("update-status", (_, data) => cb(data)),
  onProgress: cb =>
    ipcRenderer.on("update-progress", (_, data) => cb(data)),
};