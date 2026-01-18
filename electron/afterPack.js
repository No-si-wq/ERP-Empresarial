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

        if (src.endsWith("package.json")) return false;
        if (src.endsWith("package-lock.json")) return false;

        if (src.endsWith(".env")) return false;
        if (src.endsWith(".env.production")) return false;

        if (src.endsWith(".gitignore")) return false;

        if (src.includes("node_modules")) return false;

        return true;
      },
    }
  );

  await fs.copy(
    path.join(__dirname, "../backend/node_modules/@prisma"),
    path.join(backendDest, "node_modules/@prisma")
  );

  await fs.copy(
    path.join(__dirname, "../backend/node_modules/.prisma"),
    path.join(backendDest, "node_modules/.prisma")
  );

  await fs.copy(
    path.join(__dirname, "../frontend/dist"),
    path.join(frontendDest, "dist")
  );

  await fs.copy(
    path.join(__dirname, "../assets"),
    assetsDest
  );

  console.log("Producción limpia: backend mínimo, frontend y assets OK");
};