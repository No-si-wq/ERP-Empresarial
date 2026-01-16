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
        if (src.includes("node_modules")) return false;
        if (src.endsWith(".env")) return false;
        if (src.endsWith(".env.production")) return false;
        if (src.includes("logs")) return false;
        if (src.includes("test")) return false;
        return true;
      },
    }
  );

  const backendNodeModules = path.join(backendDest, "node_modules");
  await fs.ensureDir(backendNodeModules);

  await fs.copy(
    path.join(__dirname, "../backend/node_modules/@prisma"),
    path.join(backendNodeModules, "@prisma")
  );

  await fs.copy(
    path.join(__dirname, "../backend/node_modules/.prisma"),
    path.join(backendNodeModules, ".prisma")
  );

  await fs.copy(
    path.join(__dirname, "../frontend/dist"),
    path.join(frontendDest, "dist")
  );

  await fs.copy(
    path.join(__dirname, "../assets"),
    assetsDest
  );

  console.log("Backend (Prisma + dotenv), Frontend y Assets listos");
};