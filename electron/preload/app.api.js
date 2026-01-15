const { ipcRenderer } = require("electron");

module.exports = {
  getAppVersion() {
    return ipcRenderer.invoke("get-app-version");
  },

  getEnv() {
    return ipcRenderer.invoke("get-env");
  },

  isDev: process.env.NODE_ENV === "development",
};