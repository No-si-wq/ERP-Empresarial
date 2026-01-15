const { ipcRenderer } = require("electron");

module.exports = {
  onLoaderStatus(callback) {
    if (typeof callback === "function") {
      ipcRenderer.on("loader-status", (_, text) => callback(text));
    }
  },

  offLoaderStatus(callback) {
    if (typeof callback === "function") {
      ipcRenderer.removeListener("loader-status", callback);
    }
  },
};