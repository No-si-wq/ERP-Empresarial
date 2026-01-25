const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

function parsePositiveInt(value, fieldName) {
  const num = Number(value);

  if (!Number.isInteger(num) || num <= 0) {
    const error = new Error(
      `El valor de ${fieldName} debe ser un número entero positivo.`
    );
    error.status = 400;
    throw error;
  }

  return num;
}

function parseClientId(id) {
  const clientId = Number(id);

  if (!Number.isInteger(clientId)) {
    const error = new Error('ID de cliente inválido.');
    error.status = 400;
    throw error;
  }

  return clientId;
}

function withPrismaErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Cliente no encontrado.' });
      }

      const status = error.status || 500;
      const message =
        status === 500 ? 'Error interno del servidor.' : error.message;

      console.error(error);
      res.status(status).json({ error: message });
    }
  };
}

router.get('/', async (req, res) => {
  const prisma = getPrisma();
  try {
    const clients = await prisma.client.findMany({ orderBy: { id: 'asc' } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const prisma = getPrisma();
  const { name, rtn, email, phone, address, creditLimit, creditBalance, creditDays } = req.body;
  try {
    const client = await prisma.client.create({
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
  const prisma = getPrisma();
  const { id } = req.params;
  const { name, rtn, email, phone, address, creditLimit } = req.body;
  try {
    const client = await prisma.client.update({
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
    const prisma = getPrisma();
    const { id } = req.params;
    try {
      await prisma.client.delete({
        where: { id: parseInt(id) }
      });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/:id/renew-credit',
  withPrismaErrorHandling(async (req, res) => {
    const prisma = getPrisma();

    const clientId = parseClientId(req.params.id);
    const daysToAdd = parsePositiveInt(req.body.extraDays, 'extraDays');

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        creditDays: { increment: daysToAdd },
        lastCreditDate: new Date()
      }
    });

    res.json({
      message: `Crédito renovado por ${daysToAdd} días adicionales.`,
      client: updatedClient
    });
  })
);

router.patch(
  '/:id/reset-credit-days',
  withPrismaErrorHandling(async (req, res) => {
    const prisma = getPrisma();

    const clientId = parseClientId(req.params.id);
    const days = parsePositiveInt(req.body.newCreditDays, 'newCreditDays');

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        creditDays: days,
        lastCreditDate: new Date()
      }
    });

    res.json({
      message: `Días de crédito restablecidos a ${days}.`,
      client: updatedClient
    });
  })
);

module.exports = router;