const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const SEED_NAME = "initial_seed";

async function seed() {
  const prisma = new PrismaClient();

  try {
    console.log("Verificando estado del seed…");

    const alreadyRun = await prisma.seedHistory.findUnique({
      where: { name: SEED_NAME },
    });

    if (alreadyRun) {
      console.log("Seed ya fue ejecutado, se omite.");
      return;
    }

    console.log("Ejecutando seed…");

    await prisma.$transaction(async (tx) => {

      const monedaBase = await tx.currency.upsert({
        where: { clave: "01" },
        update: {},
        create: {
          clave: "01",
          descripcion: "Lempiras",
          abreviatura: "L",
          tipoCambio: 1,
        },
      });

      await tx.payment_methods.upsert({
        where: { clave: "CRED" },
        update: {},
        create: {
          clave: "CRED",
          descripcion: "Crédito de clientes",
          tipo: "CRED",
          monedaId: monedaBase.id,
        },
      });

      const permisos = [
        "/ventas/panel",
        "/ventas",
        "/clientes",
        "/compras",
        "/compras/facturas",
        "/proveedores",
        "/tiendas",
        "/usuarios",
        "/formas-pago",
        "/categorias",
        "/monedas",
        "/impuestos",
        "/cajas",
        "/inventarioConsulta",
        "/reportes",
        "/utilidad",
        "/kardex",
        "/pagos-cliente",
        "/backup",
        "/restore",
        "/permisos",
        "/scheduled-backups",
        "/updates",
        "PERMISSION_DELETE_ROLE",
      ];

      for (const key of permisos) {
        await tx.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: key },
        });
      }

      const adminRole = await tx.role.upsert({
        where: { name: "admin" },
        update: {},
        create: { name: "admin" },
      });

      const allPermissions = await tx.permission.findMany();

      for (const perm of allPermissions) {
        await tx.permissionOnRole.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }

      const adminUser = await tx.user.findUnique({
        where: { username: "admin" },
      });

      if (!adminUser) {
        await tx.user.create({
          data: {
            username: "admin",
            email: "admin@system.com",
            password: await bcrypt.hash("1234", 10),
            roleId: adminRole.id,
          },
        });
      }

      await tx.seedHistory.create({
        data: { name: SEED_NAME },
      });
    });

    console.log("SEED COMPLETADO CON ÉXITO");

  } catch (err) {
    console.error("Error en seed:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seed;