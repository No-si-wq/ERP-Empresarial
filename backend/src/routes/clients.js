const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

router.get('/', async (req, res) => {
  try {
    const clients = await req.prisma.client.findMany({ orderBy: { id: 'asc' } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { name, rtn, email, phone, address, creditLimit, creditBalance, creditDays } = req.body;
  try {
    const client = await req.prisma.client.create({
      data: {
        name,
        rtn,
        email,
        phone,
        address,
        creditLimit: creditLimit ?? 0,
        creditBalance: creditBalance ?? 0,
        creditDays: creditDays ?? 0
      }
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, rtn, email, phone, address, creditLimit } = req.body;
  try {
    const client = await req.prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name,
        rtn,
        email,
        phone,
        address,
        creditLimit: creditLimit ?? undefined,
      }
    });
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', 
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
  const { id } = req.params;
  try {
    await req.prisma.client.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/renew-credit', async (req, res) => {
  const { id } = req.params;
  const { extraDays } = req.body;

  try {
    const daysToAdd = Number(extraDays);
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
      return res.status(400).json({ error: 'El valor de extraDays debe ser un número positivo.' });
    }

    const updatedClient = await req.prisma.client.update({
      where: { id: Number(id) },
      data: {
        creditDays: { increment: daysToAdd },
        creditType: 'RENOVADO'
      }
    });

    res.json({
      message: `Límite de crédito renovado por ${daysToAdd} días adicionales.`,
      client: updatedClient
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    res.status(400).json({ error: error.message });
  }
});


router.patch('/:id/reset-credit-days', async (req, res) => {
  const { id } = req.params;
  const { newCreditDays } = req.body;

  try {
    const days = Number(newCreditDays);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'El valor de newCreditDays debe ser un número positivo.' });
    }

    const updatedClient = await req.prisma.client.update({
      where: { id: Number(id) },
      data: {
        creditDays: days,
        creditType: 'RESTABLECIDO'
      }
    });

    res.json({
      message: `Límite de crédito restablecido a ${days} días.`,
      client: updatedClient
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;