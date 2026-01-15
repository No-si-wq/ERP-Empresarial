const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const users = await req.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    key: true,
                  }
                }
              }
            }
          }
        },
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });

    const usersWithPermissions = users.map(u => ({
      ...u,
      permissions: u.role?.permissions.map(p => p.permission.key) || [],
    }));

    res.json(usersWithPermissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/', async (req, res) => {
  const { email, username, password, roleId } = req.body;

  if (!email || !username || !password || !roleId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await req.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: { connect: { id: Number(roleId) } }
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: { select: { key: true } }
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      permissions: user.role.permissions.map(p => p.permission.key),
      createdAt: user.createdAt
    });

  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'El email o usuario ya existe' });
    } else {
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
});

router.put('/:id', async (req, res) => {
  const { email, username, password, roleId } = req.body;
  const userId = Number(req.params.id);

  if (!email && !username && !password && !roleId) {
    return res.status(400).json({ error: 'Debes proporcionar al menos un campo para actualizar' });
  }

  try {
    const dataToUpdate = {
      ...(email && { email }),
      ...(username && { username }),
      ...(password && { password: await bcrypt.hash(password, 10) }),
      ...(roleId && { role: { connect: { id: Number(roleId) } } })
    };

    const user = await req.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: { select: { key: true } }
              }
            }
          }
        }
      }
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      permissions: user.role.permissions.map(p => p.permission.key),
      createdAt: user.createdAt
    });

  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'El email o usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/:id',
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  try {
    await req.prisma.user.delete({
      where: { id: Number(req.params.id) }
    });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;