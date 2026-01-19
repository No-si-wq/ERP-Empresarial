const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

const prisma = getPrisma();

const { authenticateToken } = require('../../middlewares/authMiddleware');
const checkPermission = require('../../middlewares/checkPermission');

const validateNumericId = (id) => {
  const num = parseInt(id, 10);
  return Number.isInteger(num) ? num : null;
};

router.get('/by-store/:storeId', authenticateToken, async (req, res) => {
  const storeId = validateNumericId(req.params.storeId);
  if (!storeId) {
    return res.status(400).json({ error: 'storeId inválido' });
  }

  try {
    const productos = await prisma.product.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        priceBase: true,
        priceFinal: true,
        costBase: true,
        costFinal: true,
        category: {
          select: { id: true, name: true },
        },
        tax: {
          select: {
            id: true,
            clave: true,
            percent: true,
          },
        },
      },
    });

    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error interno al obtener productos' });
  }
});

router.post('/tienda/:storeId', authenticateToken, async (req, res) => {
  const storeId = validateNumericId(req.params.storeId);
  if (!storeId) {
    return res.status(400).json({ error: 'storeId inválido' });
  }

  const {
    name,
    sku,
    quantity,
    priceBase,
    priceFinal,
    costBase,
    costFinal,
    taxId,
    categoryId,
  } = req.body;

  if (
    !name ||
    !sku ||
    quantity == null ||
    priceBase == null ||
    priceFinal == null ||
    taxId == null
  ) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const nuevoProducto = await prisma.product.create({
      data: {
        name,
        sku,
        quantity,
        priceBase,
        priceFinal,
        costBase: costBase ?? 0,
        costFinal: costFinal ?? costBase ?? 0,
        storeId,
        taxId,
        categoryId: categoryId || null,
      },
      include: {
        tax: { select: { id: true, clave: true, percent: true } },
        category: true,
        store: true,
      },
    });

    res.json(nuevoProducto);
  } catch (error) {
    console.error('Error creando producto:', error);

    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(409).json({
        error: 'El SKU ya existe para esta tienda',
      });
    }

    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const id = validateNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const {
    name,
    sku,
    quantity,
    priceBase,
    priceFinal,
    costBase,
    costFinal,
    categoryId,
    taxId,
    storeId,
  } = req.body;

  const data = {};

  if (name) data.name = name;
  if (sku) data.sku = sku;
  if (quantity != null) data.quantity = quantity;
  if (priceBase != null) data.priceBase = priceBase;
  if (priceFinal != null) data.priceFinal = priceFinal;
  if (costBase != null) data.costBase = costBase;
  if (costFinal != null) data.costFinal = costFinal;

  if (storeId) data.store = { connect: { id: storeId } };
  if (taxId) data.tax = { connect: { id: taxId } };

  if (categoryId === null) {
    data.category = { disconnect: true };
  } else if (categoryId) {
    data.category = { connect: { id: categoryId } };
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        store: { select: { id: true, nombre: true } },
        category: { select: { id: true, name: true } },
        tax: { select: { id: true, clave: true, percent: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar producto:', error);

    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(409).json({ error: 'El SKU ya existe' });
    }

    res.status(500).json({
      error: 'Error interno al actualizar producto',
    });
  }
});

router.delete(
  '/:id',
  authenticateToken,
  checkPermission('PERMISSION_DELETE_ROLE'),
  async (req, res) => {
    const id = validateNumericId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      await prisma.product.delete({ where: { id } });
      res.sendStatus(200);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error interno al eliminar producto' });
    }
  }
);

module.exports = router;