const { Client } = require("pg");
const crypto = require("crypto");

function escapeIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function isValidDatabaseUrl(url) {
  return (
    typeof url === "string" &&
    url.startsWith("postgresql://") &&
    url.length > 20
  );
}

async function ensureDatabaseExists() {
  const existingUrl = process.env.DATABASE_URL;

  if (isValidDatabaseUrl(existingUrl)) {
    console.log("DATABASE_URL válida detectada. Usando base de datos existente.");
    return existingUrl;
  }

  const { DB_HOST, DB_PORT, DB_ADMIN_USER, DB_ADMIN_PASSWORD } = process.env;

  if (!DB_HOST || !DB_PORT) {
    throw new Error("DB_HOST y DB_PORT deben estar definidos");
  }

  console.log("Generando base de datos y usuario PostgreSQL...");

  const newUser = `o2user_${crypto.randomBytes(4).toString("hex")}`;
  const newPassword = crypto.randomBytes(12).toString("hex");
  const newDatabase = `o2db_${crypto.randomBytes(4).toString("hex")}`;

  const adminClient = new Client({
    user: DB_ADMIN_USER || "postgres",
    password: DB_ADMIN_PASSWORD,
    host: DB_HOST,
    port: Number(DB_PORT),
  });

  await adminClient.connect();

  try {
    await adminClient.query(
      `CREATE USER ${escapeIdentifier(newUser)} WITH PASSWORD ${escapeLiteral(newPassword)}`
    );

    await adminClient.query(
      `CREATE DATABASE ${escapeIdentifier(newDatabase)} OWNER ${escapeIdentifier(newUser)}`
    );
  } finally {
    await adminClient.end();
  }

  const databaseUrl =
    `postgresql://${newUser}:${newPassword}@${DB_HOST}:${DB_PORT}/${newDatabase}`;

  process.env.DATABASE_URL = databaseUrl;

  console.log("Base de datos creada y DATABASE_URL configurada.");

  return databaseUrl;
}

module.exports = ensureDatabaseExists;