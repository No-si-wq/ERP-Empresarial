const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const roles = await req.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    const cleanRoles = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map(p => ({
        id: p.permission.id,
        key: p.permission.key,
        description: p.permission.description
      }))
    }));

    res.json(cleanRoles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

router.get('/:id', async (req, res) => {
  const roleId = Number(req.params.id);
  if (isNaN(roleId)) return res.status(400).json({ error: 'ID de rol inválido' });

  try {
    const role = await req.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    if (!role) return res.status(404).json({ error: 'Rol no encontrado' });

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => ({
        id: p.permission.id,
        key: p.permission.key,
        description: p.permission.description
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el rol' });
  }
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const role = await req.prisma.role.create({ data: { name, description } });
    res.status(201).json({ id: role.id, name: role.name, description: role.description });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Rol ya existe' });
    res.status(500).json({ error: 'Error al crear rol' });
  }
});

router.put('/:id', async (req, res) => {
  const roleId = Number(req.params.id);
  const { name, description } = req.body;

  try {
    const updated = await req.prisma.role.update({
      where: { id: roleId },
      data: { ...(name && { name }), ...(description && { description }) }
    });
    res.json({ id: updated.id, name: updated.name, description: updated.description });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Rol no encontrado' });
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

router.delete('/:id',
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  const roleId = Number(req.params.id);
  try {
    await req.prisma.role.delete({ where: { id: roleId } });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Rol no encontrado' });
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
});

router.put('/:id/permisos', async (req, res) => {
  const roleId = Number(req.params.id);
  const { permissionIds } = req.body;

  if (!Array.isArray(permissionIds)) return res.status(400).json({ error: 'permissionIds debe ser un array' });

  try {
    const roleExists = await req.prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) return res.status(404).json({ error: 'Rol no encontrado' });

    await req.prisma.permissionOnRole.deleteMany({ where: { roleId } });

    for (const pid of permissionIds) {
      await req.prisma.permissionOnRole.create({
        data: { roleId, permissionId: pid }
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar permisos' });
  }
});

module.exports = router;