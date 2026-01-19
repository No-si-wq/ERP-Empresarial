const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const prisma = getPrisma();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

function checkProtectedPaymentMethod(req, res, next) {
  const { id } = req.params;
  if (!id) return next();

  prisma.payment_methods.findUnique({ where: { id: parseInt(id) } })
    .then(method => {
      if (method && method.tipo === "CRED") {
        return res.status(400).json({ error: "El método de crédito (CRED) no puede modificarse ni eliminarse." });
      }
      next();
    })
    .catch(next);
}

router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
  const [data, total] = await Promise.all([
    prisma.payment_methods.findMany({
      skip,
      take: parseInt(limit),
      orderBy: { clave: 'asc' },
      include: { moneda: true } 
    }),
    prisma.payment_methods.count()
  ]);

    res.json({ data, total });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener métodos de pago');
  }
});

router.post('/', async (req, res) => {
  const { descripcion, tipo, clave, monedaId } = req.body;

    if (tipo === "CRED") {
      return res.status(400).json({ error: "La clave CRED está reservada y no puede crearse manualmente." });
    }

  if (!clave || !descripcion || !tipo || !monedaId) {
    return res.status(400).send('Faltan campos obligatorios');
  }

  try {
    await prisma.payment_methods.create({
      data: { clave, descripcion, tipo, monedaId: parseInt(monedaId) }
    });

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar método de pago');
  }
});

router.put('/:id', checkProtectedPaymentMethod, async (req, res) => {
  const { descripcion, tipo, clave, monedaId } = req.body;
  if (!clave || !descripcion || !tipo || !monedaId) {
    return res.status(400).send('Faltan campos obligatorios');
  }

  try {
    const { id } = req.params;
    const { clave, descripcion, tipo, monedaId } = req.body;
    await prisma.payment_methods.update({
      where: { id: parseInt(id) },
      data: { clave, descripcion, tipo, monedaId: parseInt(monedaId) }
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al editar método de pago');
  }
});

router.delete('/:id', checkProtectedPaymentMethod,
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  try {
    await prisma.payment_methods.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar método de pago');
  }
});

router.get('/next-clave', async (req, res) => {
  try {
    const existing = await prisma.payment_methods.findMany({
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
  const { clave } = req.params;

  try {
    const exists = await prisma.payment_methods.findFirst({
      where: { clave: clave }
    });

    res.json({ exists: !!exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar la clave' });
  }
});

module.exports = router;