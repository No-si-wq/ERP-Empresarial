const path = require("path");

const backend = require("./index");

backend.setBasePath?.(
  path.join(process.resourcesPath, "backend")
);

module.exports = backend;