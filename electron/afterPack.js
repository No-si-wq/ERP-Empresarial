const path = require("path");
const fs = require("fs-extra");

exports.default = async function (context) {
  const resourcesPath = path.join(context.appOutDir, "resources");

  const backendDest = path.join(resourcesPath, "backend");
  const frontendDest = path.join(resourcesPath, "frontend");
  const assetsDest = path.join(resourcesPath, "assets");

  await fs.remove(backendDest);
  await fs.remove(frontendDest);
  await fs.remove(assetsDest);

  await fs.copy(
    path.join(__dirname, "../backend"),
    backendDest,
    {
      filter: (src) => {
        if (src.endsWith(".env")) return false;
        if (src.endsWith(".env.production")) return false;
        if (src.includes("node_modules/.cache")) return false;
        if (src.includes(".git")) return false;

        return true;
      },
    }
  );

  await fs.copy(
    path.join(__dirname, "../frontend/dist"),
    path.join(frontendDest, "dist")
  );

  console.log("Backend y Frontend copiados a resources");
};