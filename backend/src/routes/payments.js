const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const prisma = getPrisma();

router.post('/', async (req, res) => {
  const { clientId, paymentMethodId, amount, type } = req.body;

  if (!clientId || !paymentMethodId || !amount || !type) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const payment = await prisma.clientPayment.create({
      data: {
        clientId,
        paymentMethodId,
        amount,
      }
    });

    if (type === 'USE') {
      await prisma.client.update({
        where: { id: clientId },
        data: { creditBalance: { increment: amount } }
      });
    } else if (type === 'PAY') {
      await prisma.client.update({
        where: { id: clientId },
        data: { creditBalance: { decrement: amount } }
      });
    } else {
      return res.status(400).json({ error: 'Tipo inválido, use USE o PAY' });
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(clientId) },
      include: {
        payments: {
          include: {
            payment_method: true
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const availableCredit = client.creditLimit - client.creditBalance;

    res.json({
      id: client.id,
      name: client.name,
      rtn: client.rtn,
      email: client.email,
      phone: client.phone,
      address: client.address,
      creditLimit: client.creditLimit,
      creditBalance: client.creditBalance,
      availableCredit,
      creditDays: client.creditDays,
      payments: client.payments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
