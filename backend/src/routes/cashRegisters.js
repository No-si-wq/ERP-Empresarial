const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/by-store/:storeId', async (req, res) => {
  const storeId = parseInt(req.params.storeId);
  if (isNaN(storeId)) return res.status(400).json({ error: 'storeId inválido' });

  try {
    const cajas = await req.prisma.cashRegister.findMany({ where: { storeId } });
    res.json(cajas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cajas' });
  }
});

router.post('/tienda/:storeId', async (req, res) => {
  const { numeroDeCaja, descripcion, formatoNota, formatoCFDI } = req.body;
  const storeId = parseInt(req.params.storeId);

  if (!numeroDeCaja || !descripcion || !formatoNota || !formatoCFDI) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  if (isNaN(storeId)) {
    return res.status(400).json({ error: 'storeId debe ser un número válido' });
  }

  try {
    const nuevaCaja = await req.prisma.cashRegister.create({
      data: {
        numeroDeCaja,
        descripcion,
        formatoNota,
        formatoCFDI,
        store: { connect: { id: storeId } }
      }
    });

    res.status(201).json(nuevaCaja);
  } catch (err) {
    console.error('Error al crear caja:', err);
    res.status(500).json({ error: 'Error al crear caja' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { numeroDeCaja, descripcion, formatoNota, formatoCFDI } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  if (!numeroDeCaja || !descripcion || !formatoNota || !formatoCFDI) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const updated = await req.prisma.cashRegister.update({
      where: { id },
      data: { numeroDeCaja, descripcion, formatoNota, formatoCFDI }
    });

    res.json(updated);
  } catch (err) {
    console.error('Error al editar caja:', err);
    res.status(500).json({ error: 'Error al editar caja' });
  }
});

router.delete('/:id',
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    await req.prisma.cashRegister.delete({ where: { id } });
    res.sendStatus(204);
  } catch (err) {
    console.error('Error al eliminar caja:', err);
    res.status(500).json({ error: 'Error al eliminar caja' });
  }
});

router.get('/next-clave', async (req, res) => {
  try {
    const existing = await req.prisma.cashRegister.findMany({
      select: { numeroDeCaja: true },
      orderBy: { numeroDeCaja: 'asc' }
    });

    const existingNumbers = new Set(
      existing
        .map(caja => parseInt(caja.numeroDeCaja))
        .filter(n => !isNaN(n))
    );

    let next = 1;
    while (existingNumbers.has(next)) {
      next++;
    }

    const numeroDeCaja = next.toString().padStart(2, '0');

    res.json({ clave: numeroDeCaja });
  } catch (err) {
    console.error('Error al obtener next clave para caja:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/check-clave/:numeroDeCaja', async (req, res) => {
  const numeroDeCajaStr = req.params.numeroDeCaja;
  const numeroDeCaja = parseInt(numeroDeCajaStr, 10);

  if (isNaN(numeroDeCaja)) {
    return res.status(400).json({ error: 'Número de caja inválido' });
  }

  try {
    const exists = await req.prisma.cashRegister.findFirst({
      where: { numeroDeCaja }
    });

    res.json({ exists: !!exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar el número de caja' });
  }
});

module.exports = router;