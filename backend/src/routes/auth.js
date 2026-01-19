const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPrisma } = require("../prisma");

const prisma = getPrisma();

const { getJwtSecrets } = require("../security/jwtSecrets");
const { verifyJwtToken } = require("../security/verifyJwt");

const router = express.Router();

router.get("/validate", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ valid: false });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = verifyJwtToken(token);

    res.json({
      valid: true,
      userId: decoded.userId,
      role: decoded.roleName,
    });
  } catch {
    res.status(401).json({ valid: false });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const { current: jwtSecret } = getJwtSecrets();

    const user = await prisma.user.findFirst({
      where: { username },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Usuario o contraseña incorrectos" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ message: "Usuario o contraseña incorrectos" });
    }

    if (!user.role) {
      return res.status(403).json({ message: "Usuario sin rol asignado" });
    }

    const permissions = user.role.permissions
      .filter(p => p.permission)
      .map(p => p.permission.key);

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roleId: user.role.id,
        roleName: user.role.name,
        permissions,
      },
      jwtSecret,
      {
        expiresIn: "2h",
      }
    );

    res.json({
      token,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions,
    });

  } catch (err) {
    console.error("Error en /login:", err);
    res.status(500).json({ message: "Error interno de autenticación" });
  }
});

module.exports = router;