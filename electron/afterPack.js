const path = require("path");
const fs = require("fs-extra");

const EXTERNALS = [
  "@prisma/client",
  "prisma",

  "pg",

  "pdfmake",
  "@foliojs-fork/*",

  "exceljs",
  "multer"
];

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

  for (const dep of EXTERNALS) {
    const src = path.join(__dirname, "../backend/node_modules", dep);
    const dest = path.join(backendDest, "node_modules", dep);

    if (await fs.pathExists(src)) {
      await fs.copy(src, dest);
      console.log(`Copiado external: ${dep}`);
    } else {
      console.warn(`External no encontrado en node_modules: ${dep}`);
    }
  }

  const prismaEngineSrc = path.join(__dirname, "../backend/node_modules/.prisma");
  const prismaEngineDest = path.join(backendDest, "node_modules/.prisma");

  if (await fs.pathExists(prismaEngineSrc)) {
    await fs.copy(prismaEngineSrc, prismaEngineDest);
    console.log("Prisma engines copiados");
  }

  await fs.copy(
    path.join(__dirname, "../frontend/dist"),
    path.join(frontendDest, "dist")
  );

  await fs.copy(
    path.join(__dirname, "../assets"),
    assetsDest
  );

  console.log("Producción limpia: backend bundleado, frontend y assets OK");
};