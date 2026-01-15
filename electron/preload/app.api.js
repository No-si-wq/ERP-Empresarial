const { ipcRenderer } = require("electron");

module.exports = {
  getAppVersion() {
    return ipcRenderer.invoke("get-app-version");
  },

  isDev: process.env.NODE_ENV === "development",
};