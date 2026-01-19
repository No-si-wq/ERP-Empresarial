const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const prisma = getPrisma();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { id: 'asc' } });
    res.json(suppliers);
  } catch {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

router.post('/', async (req, res) => {
  const { name, rtn, email, phone, address } = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: { name, rtn, email, phone, address }
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, rtn, email, phone, address } = req.body;
  try {
    const updatedSupplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { name, rtn, email, phone, address }
    });
    res.json(updatedSupplier);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

router.delete('/:id',
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.supplier.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;