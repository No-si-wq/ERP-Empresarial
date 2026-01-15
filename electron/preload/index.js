const { contextBridge } = require("electron");

const backupAPI = require("./backup.api");
const backendAPI = require("./backend.api");
const appAPI = require("./app.api");
const loaderAPI = require("./loader.api");

contextBridge.exposeInMainWorld("api", {
  ...backupAPI,
  ...backendAPI,
  ...appAPI,
  ...loaderAPI,
});