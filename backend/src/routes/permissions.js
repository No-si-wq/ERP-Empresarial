const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const perms = await req.prisma.permission.findMany({ orderBy: { id: 'asc' } });
    const cleanPerms = perms.map(p => ({ id: p.id, key: p.key, description: p.description }));
    res.json(cleanPerms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
});

router.post('/', async (req, res) => {
  const { key, description } = req.body;
  if (!key) return res.status(400).json({ error: 'Key requerida' });

  try {
    const perm = await req.prisma.permission.create({ data: { key, description } });
    res.status(201).json({ id: perm.id, key: perm.key, description: perm.description });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Permiso ya existe' });
    res.status(500).json({ error: 'Error al crear permiso' });
  }
});

router.delete('/:id',   
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'), 
  async (req, res) => {
  const id = Number(req.params.id);
  try {
    await req.prisma.permission.delete({ where: { id } });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Permiso no encontrado' });
    res.status(500).json({ error: 'Error al eliminar permiso' });
  }
});

router.get('/role/:roleId', async (req, res) => {
  const roleId = Number(req.params.roleId);

  try {
    const role = await req.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } }
    });

    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });

    const cleanPermissions = role.permissions.map(p => ({
      id: p.permission.id,
      key: p.permission.key,
      description: p.permission.description
    }));

    res.json(cleanPermissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener permisos del rol' });
  }
});

router.put('/role/:roleId', async (req, res) => {
  const roleId = Number(req.params.roleId);
  const { permissionIds } = req.body;

  if (!Array.isArray(permissionIds)) return res.status(400).json({ error: 'permissionIds debe ser un array' });

  try {
    const roleExists = await req.prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) return res.status(404).json({ error: 'Rol no encontrado' });

    await req.prisma.permissionOnRole.deleteMany({ where: { roleId } });

    for (const pid of permissionIds) {
      await req.prisma.permissionOnRole.create({ data: { roleId, permissionId: pid } });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar permisos' });
  }
});

module.exports = router;