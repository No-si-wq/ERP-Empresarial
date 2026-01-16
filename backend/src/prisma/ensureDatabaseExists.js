const { Client } = require("pg");
const crypto = require("crypto");

async function ensureDatabaseExists() {

  if (env.DATABASE_URL) {
    console.log("DATABASE_URL ya existe. No se genera base de datos.");
    process.env.DATABASE_URL = env.DATABASE_URL;
    return;
  }

  if (!env.DB_HOST || !env.DB_PORT) {
    throw new Error("DB_HOST y DB_PORT deben estar definidos en .env.production");
  }

  console.log("Generando base de datos y usuario PostgreSQL...");

  const newUser = "o2user_" + crypto.randomBytes(4).toString("hex");
  const newPassword = crypto.randomBytes(12).toString("hex");
  const newDatabase = "o2db_" + crypto.randomBytes(4).toString("hex");

  const adminClient = new Client({
    user: "postgres",
    password: "mi_contrasenia",
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
  });

  try {
    await adminClient.connect();

    await adminClient.query(`CREATE USER ${newUser} WITH PASSWORD $1`, [newPassword]);
    await adminClient.query(`CREATE DATABASE ${newDatabase} OWNER ${newUser}`);

    const databaseUrl =
      `postgresql://${newUser}:${newPassword}@${env.DB_HOST}:${env.DB_PORT}/${newDatabase}`;

    const updatedEnv = {
      ...env,
      DATABASE_URL: databaseUrl,
    };

    saveEnv(updatedEnv);

    process.env.DATABASE_URL = databaseUrl;

    console.log("Base de datos creada y DATABASE_URL configurado.");

  } finally {
    await adminClient.end();
  }
}

module.exports = ensureDatabaseExists;