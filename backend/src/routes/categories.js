const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const category = await req.prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear la categoría' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const category = await req.prisma.category.update({
      where: { id: parseInt(id) },
      data: { name }
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar la categoría' });
  }
});

router.delete('/:id', 
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    res.status(400).json({ error: 'Error al eliminar la categoría' });
  }
});

module.exports = router;