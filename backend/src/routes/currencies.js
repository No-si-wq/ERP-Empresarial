const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  const prisma = getPrisma();
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [data, total] = await Promise.all([
      prisma.currency.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { id: 'asc' }
      }),
      prisma.currency.count()
    ]);
    res.json({ data, total });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener monedas');
  }
});

router.post('/', async (req, res) => {
  const prisma = getPrisma();
  const { clave, descripcion, abreviatura, tipoCambio } = req.body;
  if (!clave || !descripcion || !abreviatura || typeof tipoCambio !== 'number') {
    return res.status(400).send('Faltan campos obligatorios');
  }

  try {
    const nueva = await prisma.currency.create({
      data: { clave, descripcion, abreviatura, tipoCambio }
    });
    res.status(201).json(nueva);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar moneda');
  }
});

router.put('/:id', async (req, res) => {
  const prisma = getPrisma();
  const { clave, descripcion, abreviatura, tipoCambio } = req.body;
  if (!clave || !descripcion || !abreviatura || typeof tipoCambio !== 'number') {
    return res.status(400).send('Faltan campos obligatorios');
  }

  try {
    const actualizada = await prisma.currency.update({
      where: { id: parseInt(req.params.id) },
      data: { clave, descripcion, abreviatura, tipoCambio }
    });
    res.json(actualizada);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al editar moneda');
  }
});

router.delete('/:id', 
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
    const prisma = getPrisma();
    try {
      await prisma.currency.delete({ where: { id: parseInt(req.params.id) } });
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al eliminar moneda');
    }
  }
);

router.get('/next-clave', async (req, res) => {
  const prisma = getPrisma();
  try {
    const existing = await prisma.currency.findMany({
      select: { clave: true },
      orderBy: { clave: 'asc' }
    });

    const existingNumbers = new Set(
      existing
        .map(pm => parseInt(pm.clave))
        .filter(n => !isNaN(n))
    );

    let next = 1;
    while (existingNumbers.has(next)) {
      next++;
    }

    const clave = next.toString().padStart(2, '0');
    res.json({ clave });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/check-clave/:clave', async (req, res) => {
  const prisma = getPrisma();
  const { clave } = req.params;

  try {
    const exists = await prisma.currency.findFirst({
      where: { clave: clave }
    });

    res.json({ exists: !!exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar la clave' });
  }
});

module.exports = router;