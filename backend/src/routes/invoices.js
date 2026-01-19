const express = require('express');
const router = express.Router();
const { getPrisma } = require("../prisma");

async function generarFolioPorCaja(tx, cajaId, tipo) {
  const registro = await tx.folioCounter.findUnique({
    where: { caja_id_tipo: { caja_id: cajaId, tipo } }
  });

  let ultimoFolio = 1;

  if (!registro) {
    await tx.folioCounter.create({
      data: { caja_id: cajaId, tipo, ultimo_folio: 1 },
    });
  } else {
    ultimoFolio = registro.ultimo_folio + 1;
    await tx.folioCounter.update({
      where: { caja_id_tipo: { caja_id: cajaId, tipo } },
      data: { ultimo_folio: ultimoFolio },
    });
  }

  return String(ultimoFolio).padStart(5, "0");
}

async function buildInvoiceItems(productos) {
  const prisma = getPrisma();
  let total = 0;
  const itemsData = [];

  for (const p of productos) {
    const prod = await prisma.product.findUnique({ where: { id: p.productoId } });
    if (!prod) throw new Error(`Producto con id ${p.productoId} no existe`);

    const subtotal = p.cantidad * prod.priceFinal;
    total += subtotal;

    itemsData.push({
      productId: prod.id,
      quantity: p.cantidad,
      priceBase: prod.priceBase,
      priceFinal: prod.priceFinal,
      subtotal
    });
  }

  return { itemsData, total };
}

router.get('/admin', async (req, res) => {
  const prisma = getPrisma();
  try {
    const invoices = await prisma.invoice.findMany({
      include: { client: true, caja: true, },
      orderBy: { id: 'asc' },
    });

    const result = invoices.map(inv => ({
      id: inv.id,
      folio: inv.folio || "-",
      fecha: inv.createdAt,
      cliente: inv.client?.name || "Sin cliente",
      caja: inv.caja?.descripcion || `Caja ${inv.caja?.numeroDeCaja}` || "Sin caja",
      total: inv.total,
      estado: inv.estado || "EMITIDA",
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el listado de ventas" });
  }
});

router.get('/next-folio-estimado/:cajaId', async (req, res) => {
  const prisma = getPrisma();
  const { cajaId } = req.params;
  if (!cajaId) return res.status(400).json({ error: 'Falta el id de la caja' });

  try {
    const folio = await prisma.$transaction(async (tx) => {
      const registro = await tx.folioCounter.findUnique({
        where: { caja_id_tipo: { caja_id: Number(cajaId), tipo: 'invoice' } }
      });

      if (!registro) {
        return '00001';
      }

      return String(registro.ultimo_folio + 1).padStart(5, '0');
    });

    res.json({ folio });
  } catch (err) {
    console.error('Error al obtener folio estimado:', err);
    res.status(500).json({ error: 'Error interno al obtener folio estimado' });
  }
});

router.post('/', async (req, res) => {
  const prisma = getPrisma();
  try {
    const { clienteId, productos, storeId, cajaId, importeRecibido, cambio, formasPago } = req.body;
    if (!productos?.length) return res.status(400).json({ error: 'Debe incluir al menos un producto' });

    const { itemsData, total } = await buildInvoiceItems(productos);

    const invoice = await prisma.$transaction(async tx => {
      const folio = await generarFolioPorCaja(tx, cajaId, 'invoice');

      const credPago = formasPago?.find(f => f.metodo.startsWith('CRED'));
      if (credPago) {
        const cliente = await tx.client.findUnique({ where: { id: clienteId } });
        if (!cliente) throw new Error('Cliente no existe');
        if ((cliente.creditBalance ?? 0) + total > (cliente.creditLimit ?? 0)) {
          throw new Error('Saldo de crédito insuficiente');
        }
        await tx.client.update({
          where: { id: clienteId },
          data: { creditBalance: (cliente.creditBalance ?? 0) + total }
        });
      }

      const invoiceCreated = await tx.invoice.create({
        data: {
          folio,
          total,
          importeRecibido: importeRecibido ?? null,
          cambio: cambio ?? null,
          formasPago: formasPago ? JSON.stringify(formasPago) : undefined,
          estado: 'EMITIDA',
          client: clienteId ? { connect: { id: clienteId } } : undefined,
          store: { connect: { id: storeId } },
          caja: cajaId ? { connect: { id: cajaId } } : undefined,
          items: { create: itemsData }
        },
        include: { client: true, items: { include: { product: true } } }
      });

      for (const item of itemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      return invoiceCreated;
    });

    res.status(201).json(invoice);

  } catch (err) {
    console.error('Error creando factura:', err);
    res.status(500).json({ error: err.message || 'Error interno al crear factura' });
  }
});

router.post('/pendiente', async (req, res) => {
  const prisma = getPrisma();
  try {
    const { clienteId, productos, storeId, cajaId, formasPago } = req.body;
    if (!productos?.length) return res.status(400).json({ error: 'Debe incluir al menos un producto' });

    const { itemsData, total } = await buildInvoiceItems(productos);

    const folio = await prisma.$transaction(async tx => generarFolioPorCaja(tx, cajaId, 'invoice'));

    const invoice = await prisma.invoice.create({
      data: {
        folio,
        total,
        estado: 'PENDIENTE',
        formasPago: formasPago ? JSON.stringify(formasPago) : undefined,
        client: clienteId ? { connect: { id: clienteId } } : undefined,
        store: storeId ? { connect: { id: storeId } } : undefined,
        caja: cajaId ? { connect: { id: cajaId } } : undefined,
        items: { create: itemsData }
      },
      include: { client: true, items: { include: { product: true } } }
    });

    res.status(201).json(invoice);

  } catch (err) {
    console.error('Error creando factura pendiente:', err);
    res.status(500).json({ error: err.message || 'Error interno al crear factura pendiente' });
  }
});

router.get('/:id', async (req, res) => {
  const prisma = getPrisma();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        store: true,
        caja: true,
        items: { include: { product: true } }
      }
    });

    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    res.json({
      id: invoice.id,
      folio: invoice.folio,
      clientId: invoice.client?.id || null,
      clienteNombre: invoice.client?.name || null,
      storeId: invoice.store?.id || null,
      cajaId: invoice.caja?.id || null,
      productos: invoice.items.map(item => {
        const cantidad = item.quantity;
        const base = item.priceBase;
        const final = item.priceFinal;

        return {
          productoId: item.product?.id || null,
          producto: item.product?.name || "Producto eliminado",
          cantidad,
          priceBase: base,
          priceFinal: final,
          totalBase: base * cantidad,
          totalFinal: final * cantidad,
          subtotal: item.subtotal,
        };
      }),
      total: invoice.total,
      estado: invoice.estado || "EMITIDA",
      fecha: invoice.createdAt,
      formasPago: invoice.formasPago ? JSON.parse(invoice.formasPago) : []
    });
  } catch (err) {
    console.error('Error al obtener factura:', err);
    res.status(500).json({ error: 'Error interno al obtener la factura' });
  }
});


router.put('/:id', async (req, res) => {
  const prisma = getPrisma();
  try {
    const id = parseInt(req.params.id, 10);
    const { clienteId, productos, storeId, cajaId, importeRecibido, cambio, formasPago } = req.body;

    if (!productos?.length) return res.status(400).json({ error: 'Debe incluir al menos un producto' });

    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    const wasEmitted = invoice.estado === 'EMITIDA';
    const oldQtyByProduct = new Map(invoice.items.map(i => [i.productId, i.quantity]));
    const newQtyByProduct = new Map(productos.map(p => [p.productoId, p.cantidad]));

    const allProductIds = Array.from(new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()]));
    const productsDB = await prisma.product.findMany({ where: { id: { in: allProductIds } } });
    const prodById = new Map(productsDB.map(p => [p.id, p]));

    let total = 0;
    const itemsData = [];

    for (const [pid, qty] of newQtyByProduct.entries()) {
      const prod = prodById.get(pid);
      if (!prod) return res.status(400).json({ error: `Producto ${pid} no existe` });

      const subtotal = qty * prod.priceFinal;
      total += subtotal;

      itemsData.push({
        productId: pid,
        quantity: qty,
        priceBase: prod.priceBase,
        priceFinal: prod.priceFinal,
        subtotal
      });
    }

    const updatedInvoice = await prisma.$transaction(async tx => {
      if (wasEmitted) {
        for (const [pid, qty] of oldQtyByProduct.entries()) {
          if (qty > 0) await tx.product.update({ where: { id: pid }, data: { quantity: { increment: qty } } });
        }
      }

      for (const { productId, quantity } of itemsData) {
        if (quantity > 0) await tx.product.update({ where: { id: productId }, data: { quantity: { decrement: quantity } } });
      }

      const oldCred = invoice.formasPago ? JSON.parse(invoice.formasPago).find(f => f.metodo.startsWith('CRED')) : null;
      const newCred = formasPago?.find(f => f.metodo.startsWith('CRED'));

      if (oldCred) {
        await tx.client.update({
          where: { id: invoice.clientId },
          data: { creditBalance: { increment: invoice.total } }
        });
      }

      if (newCred) {
        const cliente = await tx.client.findUnique({ where: { id: clienteId } });
        if (!cliente) throw new Error('Cliente no existe');
        if ((cliente.creditBalance ?? 0) + total > (cliente.creditLimit ?? 0)) 
          throw new Error('Saldo de crédito insuficiente');
        await tx.client.update({
          where: { id: clienteId },
          data: { creditBalance: (cliente.creditBalance ?? 0) + total }
        });
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      return tx.invoice.update({
        where: { id },
        data: {
          clientId: clienteId,
          storeId,
          cajaId,
          total,
          importeRecibido,
          cambio,
          estado: 'EMITIDA',
          formasPago: formasPago ? JSON.stringify(formasPago) : undefined,
          items: { create: itemsData }
        },
        include: { client: true, items: { include: { product: true } } }
      });
    });

    res.json(updatedInvoice);

  } catch (err) {
    console.error('Error al actualizar factura:', err);
    res.status(500).json({ error: err.message || 'Error interno al actualizar factura' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const prisma = getPrisma();
  try {
    const id = parseInt(req.params.id, 10);
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    if (invoice.estado === 'CANCELADA') return res.status(400).json({ error: 'La factura ya está cancelada' });

    await prisma.$transaction(async tx => {
      for (const item of invoice.items) {
        await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
      }
      await tx.invoice.update({ where: { id }, data: { estado: 'CANCELADA' } });
    });

    res.json({ message: 'Factura cancelada y productos devueltos al inventario' });
  } catch (err) {
    console.error('Error al cancelar factura:', err);
    res.status(500).json({ error: err.message || 'Error interno al cancelar factura' });
  }
});

module.exports = router;