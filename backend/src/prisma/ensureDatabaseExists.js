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
  if (isValidDatabaseUrl(process.env.DATABASE_URL)) {
    return null;
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

  const userIdent = escapeIdentifier(newUser);
  const dbIdent = escapeIdentifier(newDatabase);

  try {
    await adminClient.query(
      `CREATE USER ${userIdent} WITH PASSWORD ${escapeLiteral(newPassword)}`
    );

    await adminClient.query(
      `CREATE DATABASE ${dbIdent} OWNER ${userIdent}`
    );

    const databaseUrl =
      `postgresql://${newUser}:${newPassword}@${DB_HOST}:${DB_PORT}/${newDatabase}`;

    console.log("Base de datos creada. DATABASE_URL generada.");

    return databaseUrl;
  } finally {
    await adminClient.end();
  }
}

module.exports = ensureDatabaseExists;