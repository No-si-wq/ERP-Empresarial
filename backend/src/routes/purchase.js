const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

async function generarFolioPorCaja(tx, cajaId, tipo, incrementar = true) {
  const result = await tx.folioCounter.findUnique({
    where: { caja_id_tipo: { caja_id: cajaId, tipo } },
  });

  let ultimoFolio;

  if (!result) {
    ultimoFolio = 1;
    if (incrementar) {
      await tx.folioCounter.create({
        data: { caja_id: cajaId, tipo, ultimo_folio: ultimoFolio },
      });
    }
  } else {
    ultimoFolio = result.ultimo_folio + (incrementar ? 1 : 0);
    if (incrementar) {
      await tx.folioCounter.update({
        where: { caja_id_tipo: { caja_id: cajaId, tipo } },
        data: { ultimo_folio: ultimoFolio },
      });
    }
  }

  return String(ultimoFolio).padStart(5, "0");
}

router.get('/admin', async (req, res) => {
  const prisma = getPrisma();
  try {
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, caja: true },
      orderBy: { id: 'asc' },
    });

    const result = purchases.map(p => ({
      id: p.id,
      folio: p.folio || "-",
      fecha: p.createdAt,
      proveedor: p.supplier?.name || "Sin proveedor",
      caja: p.caja?.descripcion || `Caja ${p.caja?.numeroDeCaja}` || "Sin caja",
      total: p.total,
      estado: p.estado || "EMITIDA",
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el listado de compras" });
  }
});

router.get('/last-folio/:cajaId', async (req, res) => {
  const prisma = getPrisma();
  const { cajaId } = req.params;

  if (!cajaId) return res.status(400).json({ error: "CajaId es obligatorio" });

  try {
    const lastPurchase = await prisma.purchase.findFirst({
      where: { cajaId: Number(cajaId) },
      orderBy: { id: 'desc' },
      select: { folio: true },
    });

    const ultimoFolio = lastPurchase?.folio ?? "0";

    res.json({ folio: ultimoFolio });
  } catch (err) {
    console.error("Error al obtener último folio:", err);
    res.status(500).json({ error: "No se pudo obtener el último folio" });
  }
});

router.get('/:id', async (req, res) => {
  const prisma = getPrisma();
  const compraId = parseInt(req.params.id, 10);
  if (isNaN(compraId)) return res.status(400).json({ error: "ID inválido" });

  try {
    const compra = await prisma.purchase.findUnique({
      where: { id: compraId },
      include: {
        supplier: true,
        store: true,
        caja: true,
        items: { include: { product: true } }
      }
    });

    if (!compra) return res.status(404).json({ error: "Compra no encontrada" });

    res.json({
      id: compra.id,
      folio: compra.folio,
      supplierId: compra.supplier?.id || null,
      proveedorNombre: compra.supplier?.name || null,
      storeId: compra.store?.id || null,
      cajaId: compra.caja?.id || null,
      productos: compra.items.map(item => {
        const cantidad = item.quantity;
        const base = item.costBase;
        const final = item.costFinal;

        return {
          productoId: item.product?.id || null,
          producto: item.product?.name || "Producto eliminado",
          cantidad,
          costBase: base,
          costFinal: final,
          totalBase: base * cantidad,
          totalFinal: final * cantidad,
          subtotal: item.subtotal
        };
      }),
      total: compra.total,
      estado: compra.estado || "EMITIDA",
      fecha: compra.createdAt,
      formasPago: compra.formasPago ? JSON.parse(compra.formasPago) : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la compra" });
  }
});

router.post('/', async (req, res) => {
  const prisma = getPrisma();
  const { supplierId, storeId, cajaId, productos, formasPago } = req.body;
  if (!supplierId || !storeId || !cajaId || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: "Faltan datos obligatorios o productos" });
  }

  try {
    const productosDB = await Promise.all(productos.map(p => prisma.product.findUnique({ where: { id: p.productoId } })));
    for (let i = 0; i < productos.length; i++) {
      if (!productosDB[i]) return res.status(400).json({ error: `Producto ${productos[i].productoId} no existe` });
    }

    let total = 0;
    const itemsData = productos.map((p, i) => {
      const prod = productosDB[i];
      const costBase = p.costBase ?? prod.cost ?? 0;
      const costFinal = prod.costFinal ?? costBase;
      const subtotal = costFinal * p.cantidad;
      total += subtotal;
      return {
        productId: p.productoId,
        quantity: p.cantidad,
        costBase,
        costFinal,
        subtotal
      };
    });

    const createdPurchase = await prisma.$transaction(async (tx) => {
      const folio = await generarFolioPorCaja(tx, cajaId, 'purchase');
      const purchase = await tx.purchase.create({
        data: {
          folio,
          supplierId,
          storeId,
          cajaId,
          total,
          estado: 'EMITIDA',
          formasPago: formasPago ? JSON.stringify(formasPago) : undefined,
          items: { create: itemsData }
        },
        include: { items: { include: { product: true } }, supplier: true }
      });

      for (const item of itemsData) {
        await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
      }

      return purchase;
    });

    res.status(201).json({
      id: createdPurchase.id,
      folio: createdPurchase.folio,
      proveedor: createdPurchase.supplier.name,
      total: createdPurchase.total,
      productos: createdPurchase.items.map(i => ({
        producto: i.product.name,
        costBase: i.costBase,
        costFinal: i.costFinal,
        cantidad: i.quantity,
        subtotal: i.subtotal
      })),
      formasPago: createdPurchase.formasPago ? JSON.parse(createdPurchase.formasPago) : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar la compra" });
  }
});

router.post('/pendiente', async (req, res) => {
  const prisma = getPrisma();
  const { supplierId, storeId, cajaId, productos, formasPago } = req.body;
  if (!supplierId || !storeId || !cajaId || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: "Faltan datos obligatorios o productos" });
  }

  try {
    const productosDB = await Promise.all(productos.map(p => prisma.product.findUnique({ where: { id: p.productoId } })));
    for (let i = 0; i < productos.length; i++) if (!productosDB[i]) return res.status(400).json({ error: `Producto ${productos[i].productoId} no existe` });

    let total = 0;
    const itemsData = productos.map((p, i) => {
      const prod = productosDB[i];
      const costBase = p.costBase ?? prod.cost ?? 0;
      const costFinal = prod.costFinal ?? costBase;
      const subtotal = costFinal * p.cantidad;
      total += subtotal;
      return {
        productId: p.productoId,
        quantity: p.cantidad,
        costBase,
        costFinal,
        subtotal
      };
    });

    const newPurchase = await prisma.$transaction(async (tx) => {
      const folio = await generarFolioPorCaja(tx, cajaId, 'purchase');

      return await tx.purchase.create({
        data: {
          folio,
          supplierId,
          storeId,
          cajaId,
          total,
          estado: 'PENDIENTE',
          formasPago: formasPago ? JSON.stringify(formasPago) : undefined,
          items: { create: itemsData }
        },
        include: { items: true, supplier: true }
      });
    });

    res.status(201).json({ message: 'Compra creada como PENDIENTE', purchase: newPurchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo guardar la compra como pendiente" });
  }
});

router.put('/:id', async (req, res) => {
  const prisma = getPrisma();
  const compraId = parseInt(req.params.id);
  const { supplierId, storeId, cajaId, productos, formasPago } = req.body;

  if (isNaN(compraId)) return res.status(400).json({ error: 'ID inválido' });
  if (!supplierId || !storeId || !cajaId || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o productos' });
  }

  try {
    const compraActual = await prisma.purchase.findUnique({ where: { id: compraId }, include: { items: true } });
    if (!compraActual) return res.status(404).json({ error: 'Compra no encontrada' });

    const productosDB = await Promise.all(productos.map(p => prisma.product.findUnique({ where: { id: p.productoId } })));
    for (let i = 0; i < productos.length; i++) if (!productosDB[i]) return res.status(400).json({ error: `Producto ${productos[i].productoId} no existe` });

    let total = 0;
    const itemsData = productos.map((p, i) => {
      const prod = productosDB[i];
      const costBase = p.costBase ?? prod.cost ?? 0;
      const costFinal = prod.costFinal ?? costBase;
      const subtotal = costFinal * p.cantidad;
      total += subtotal;
      return { productId: p.productoId, quantity: p.cantidad, costBase, costFinal, subtotal };
    });

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      if (compraActual.estado === 'EMITIDA') {
        for (const item of compraActual.items) await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
      }

      await tx.purchaseItem.deleteMany({ where: { purchaseId: compraId } });

      const updated = await tx.purchase.update({
        where: { id: compraId },
        data: { supplierId, storeId, cajaId, total, estado: 'EMITIDA', formasPago: formasPago ? JSON.stringify(formasPago) : undefined, items: { create: itemsData } },
        include: { items: true, supplier: true }
      });

      for (const item of itemsData) await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });

      return updated;
    });

    res.json({ message: 'Compra actualizada', purchase: updatedPurchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la compra y sincronizar inventario' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const prisma = getPrisma();
  const compraId = parseInt(req.params.id);
  if (isNaN(compraId)) return res.status(400).json({ error: "ID inválido" });

  try {
    const compra = await prisma.purchase.findUnique({ where: { id: compraId }, include: { items: true } });
    if (!compra) return res.status(404).json({ error: "Compra no encontrada" });
    if (compra.estado === "CANCELADA") return res.status(400).json({ error: "La compra ya está cancelada" });

    await prisma.$transaction(async (tx) => {
      for (const item of compra.items) await tx.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } });

      await tx.purchase.update({ where: { id: compraId }, data: { estado: "CANCELADA" } });
    });

    res.json({ message: "Compra cancelada y productos devueltos al inventario" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo cancelar la compra" });
  }
});

module.exports = router;
