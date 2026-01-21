const { ipcRenderer } = require("electron");

module.exports = {
  check: () => ipcRenderer.invoke("check-for-updates"),

  download: () => ipcRenderer.invoke("download-update"),

  install: () => ipcRenderer.invoke("install-update"),

  onStatus: cb => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on("update-status", listener);

    return () => {
      ipcRenderer.removeListener("update-status", listener);
    };
  },

  onProgress: cb => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on("update-progress", listener);

    return () => {
      ipcRenderer.removeListener("update-progress", listener);
    };
  },
};