require("esbuild").build({
  entryPoints: ["src/entry-electron.js"],
  outfile: "dist/backend.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: [
    "@prisma/client",
    "prisma",
    "pg"
  ],
}).catch(() => process.exit(1));