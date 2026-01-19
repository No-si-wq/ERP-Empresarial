const express = require('express');
const PdfPrinter = require('pdfmake');
const ExcelJS = require('exceljs');
const { getPrisma } = require("../prisma");

const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

const router = express.Router();

function buildPdfDefinition(title, headers, rows, from, to) {
  return {
    content: [
      { text: `${title} (${from} a ${to})`, style: 'header' },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => '*'),
          body: [headers, ...rows]
        }
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }
    }
  };
}

async function sendPdf(res, title, headers, rows, from, to, filename) {
  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(buildPdfDefinition(title, headers, rows, from, to));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  pdfDoc.pipe(res);
  pdfDoc.end();
}

async function sendExcel(res, title, headers, rows, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);
  sheet.addRow(headers);

  rows.forEach(row => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  await workbook.xlsx.write(res);
  res.end();
}

router.get('/ventas/export', async (req, res) => {
  const prisma = getPrisma();
  const { from, to, format = 'pdf' } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'Faltan parámetros from/to' });

  try {
    const ventas = await prisma.invoice.findMany({
      where: { createdAt: { gte: new Date(from), lte: new Date(to) }, estado: "EMITIDA" },
      include: { client: true },
      orderBy: { createdAt: 'asc' }
    });

    const headers = ['ID', 'Fecha', 'Cliente', 'RTN', 'Total'];
    const rows = ventas.map(v => [
      String(v.id).padStart(5,'0'),
      v.createdAt.toISOString().substring(0, 10),
      v.client?.name || '',
      v.client?.rtn || '',
      `L. ${v.total.toFixed(2)}`
    ]);

    if (format === 'excel') await sendExcel(res, 'Ventas', headers, rows, `ventas_${from}_a_${to}.xlsx`);
    else await sendPdf(res, 'Reporte de Ventas', headers, rows, from, to, `ventas_${from}_a_${to}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generando reporte de ventas' });
  }
});

router.get('/compras/export', async (req, res) => {
  const prisma = getPrisma();
  const { from, to, format = 'pdf' } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'Faltan parámetros from/to' });

  try {
    const compras = await prisma.purchase.findMany({
      where: { createdAt: { gte: new Date(from), lte: new Date(to) }, estado: "EMITIDA" },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' }
    });

    const headers = ['ID', 'Fecha', 'Proveedor', 'RTN', 'Total'];
    const rows = compras.map(c => [
      String(c.id).padStart(5,'0'),
      c.createdAt.toISOString().substring(0, 10),
      c.supplier?.name || '',
      c.supplier?.rtn || '',
      `L. ${c.total.toFixed(2)}`
    ]);

    if (format === 'excel') await sendExcel(res, 'Compras', headers, rows, `compras_${from}_a_${to}.xlsx`);
    else await sendPdf(res, 'Reporte de Compras', headers, rows, from, to, `compras_${from}_a_${to}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generando reporte de compras' });
  }
});

router.get('/kardex-por-producto/export', async (req, res) => {
  const prisma = getPrisma();
  const { from, to, storeId, productId, format = 'excel' } = req.query;

  if (!from || !to || !storeId || !productId) {
    return res.status(400).json({
      message: "Debe especificar storeId, from, to y productId"
    });
  }

  try {
    const store = Number(storeId);
    const product = Number(productId);
    if ([store, product].some(isNaN)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const startDate = new Date(`${from}T00:00:00Z`);
    const endDate = new Date(`${to}T23:59:59Z`);

    const producto = await prisma.product.findUnique({
      where: { id: product },
      select: { id: true, name: true }
    });
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

    const obtenerMovimientos = async (modelo, estado, tipo, esCancelacion = false) => {
      const registros = await prisma[modelo].findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          storeId: store,
          ...(estado && { estado }),
          items: { some: { productId: product } }
        },
        include: {
          items: {
            where: { productId: product },
            include: { product: true }
          },
          caja: true
        }
      });

      return registros.flatMap(doc =>
        doc.items.map(item => ({
          fecha: doc.createdAt.toISOString().substring(0, 10),
          tipo,
          referencia: doc.folio || String(doc.id).padStart(5, '0'),
          caja: doc.caja?.descripcion || 'NA',
          entradas: esCancelacion ? item.quantity : tipo === 'COMPRA' ? item.quantity : 0,
          salidas: esCancelacion ? 0 : tipo === 'VENTA' ? item.quantity : 0
        }))
      );
    };

    const [compras, comprasCanceladas, ventas, ventasCanceladas] = await Promise.all([
      obtenerMovimientos('purchase', undefined, 'COMPRA'),
      obtenerMovimientos('purchase', 'CANCELADA', 'COMPRA CANCELADA', true),
      obtenerMovimientos('invoice', 'EMITIDA', 'VENTA'),
      obtenerMovimientos('invoice', 'CANCELADA', 'VENTA CANCELADA', true)
    ]);

    const movimientos = [
      ...compras,
      ...comprasCanceladas,
      ...ventas,
      ...ventasCanceladas
    ];

    if (!movimientos.length) {
      return res.status(200).json({ message: 'No hay movimientos para exportar' });
    }

    movimientos.sort((a, b) => new Date(a._datetime) - new Date(b._datetime));

    let existencia = 0;
    const rows = movimientos.map(m => {
      existencia += m.entradas - m.salidas;
      return [
        producto.name,
        m.fecha,
        m.tipo,
        m.referencia,
        m.caja,
        m.entradas,
        m.salidas,
        existencia
      ];
    });

    const headers = [
      'Producto',
      'Fecha',
      'Tipo',
      'Referencia',
      'Caja',
      'Entradas',
      'Salidas',
      'Existencia'
    ];

    if (format === 'excel') {
      await sendExcel(res, 'Kardex', headers, rows, `kardex_${producto.name}_${from}_a_${to}.xlsx`);
    } else {
      await sendPdf(res, 'Kardex', headers, rows, from, to, `kardex_${producto.name}_${from}_a_${to}.pdf`);
    }

  } catch (err) {
    console.error('Error generando Kardex:', err);
    res.status(500).json({ message: 'Error generando Kardex' });
  }
});

router.get('/venta-utilidad-por-producto/export', async (req, res) => {
  const prisma = getPrisma();
  const { from, to, storeId, productStart, productEnd, format = 'pdf' } = req.query;

  if (!from || !to || !storeId) 
    return res.status(400).json({ message: 'Debe especificar from, to y storeId' });

  try {
    const startId = productStart ? Number(productStart) : null;
    const endId = productEnd ? Number(productEnd) : null;
    let productIdArray = [];

    if (startId !== null && endId !== null) {
      const productos = await prisma.product.findMany({ 
        where: { id: { gte: startId, lte: endId } }, 
        select: { id: true } 
      });
      productIdArray = productos.map(p => p.id);
    }

    const ventas = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        estado: 'EMITIDA',
        storeId: Number(storeId),
        items: { some: { productId: { in: productIdArray } } }
      },
      select: {
        items: {
          where: { productId: { in: productIdArray } },
          select: {
            quantity: true,
            priceBase: true,
            product: { select: { id: true, name: true, costBase: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const utilidadPorProducto = {};

    ventas.forEach(v => {
      v.items.forEach(item => {
        const key = item.product.id;
        const cantidad = item.quantity;
        const precioUnit = item.priceBase ?? 0;
        const costoUnit = item.product.costBase ?? 0;
        const precioTotal = cantidad * precioUnit;
        const costoTotal = cantidad * costoUnit;
        const utilidad = precioTotal - costoTotal;

        if (!utilidadPorProducto[key]) {
          utilidadPorProducto[key] = {
            producto: item.product.name,
            cantidad: 0,
            precioTotal: 0,
            costoTotal: 0,
            utilidad: 0
          };
        }

        utilidadPorProducto[key].cantidad += cantidad;
        utilidadPorProducto[key].precioTotal += precioTotal;
        utilidadPorProducto[key].costoTotal += costoTotal;
        utilidadPorProducto[key].utilidad += utilidad;
      });
    });

    const headers = ['Producto','Cantidad','Precio Unit','Costo Unit','Precio Total','Costo Total','Utilidad','% Utilidad'];
    const rows = Object.values(utilidadPorProducto).map(p => {
      const precioUnitario = p.cantidad ? p.precioTotal / p.cantidad : 0;
      const costoUnitario = p.cantidad ? p.costoTotal / p.cantidad : 0;
      const porcentajeUtilidad = p.costoTotal === 0 ? 100 : (p.utilidad / p.costoTotal * 100);

      return [
        p.producto,
        p.cantidad,
        parseFloat(precioUnitario.toFixed(2)),
        parseFloat(costoUnitario.toFixed(2)),
        parseFloat(p.precioTotal.toFixed(2)),
        parseFloat(p.costoTotal.toFixed(2)),
        parseFloat(p.utilidad.toFixed(2)),
        porcentajeUtilidad.toFixed(2)
      ];
    });

    if (format === 'excel') 
      await sendExcel(res, 'Venta Utilidad', headers, rows, `venta_utilidad_${from}_a_${to}.xlsx`);
    else 
      await sendPdf(res, 'Venta Utilidad', headers, rows, from, to, `venta_utilidad_${from}_a_${to}.pdf`);

  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Error generando reporte de utilidad' });
  }
});

router.get('/ventas', async (req, res) => {
  const prisma = getPrisma();
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: 'Debe especificar los parámetros from y to (YYYY-MM-DD)' });
  }

  try {
    const ventas = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        estado: "EMITIDA"
      },
      include: { client: true },
      orderBy: { createdAt: 'asc' }
    });

    const rows = ventas.map(v => [
      v.id,
      v.createdAt.toISOString().substring(0, 10),
      v.client?.name || '',
      v.client?.rtn || '',
      `L. ${v.total.toFixed(2)}`
    ]);

    sendPdfResponse(res, 'Reporte de Ventas', ['ID', 'Fecha', 'Cliente', 'RTN', 'Total'], rows, from, to, `reporte_ventas_${from}_a_${to}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al generar el reporte de ventas' });
  }
});

router.get('/compras', async (req, res) => {
  const prisma = getPrisma();
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: 'Debe especificar los parámetros from y to (YYYY-MM-DD)' });
  }

  try {
    const compras = await prisma.purchase.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        estado: "EMITIDA" 
      },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' }
    });

    const rows = compras.map(c => [
      c.id,
      c.createdAt.toISOString().substring(0, 10),
      c.supplier?.name || '',
      c.supplier?.rtn || '',
      `L. ${c.total.toFixed(2)}`
    ]);

    sendPdfResponse(res, 'Reporte de Compras', ['ID', 'Fecha', 'Proveedor', 'RTN', 'Total'], rows, from, to, `reporte_compras_${from}_a_${to}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al generar el reporte de compras' });
  }
});

router.get('/venta-utilidad-por-producto', async (req, res) => {
  const prisma = getPrisma();
  const { from, to, storeId, productStart, productEnd, productIds } = req.query;

  if (!from || !to || !storeId) {
    return res.status(400).json({ message: 'Debe especificar from, to y storeId' });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const storeIdNum = Number(storeId);

  if (isNaN(storeIdNum)) return res.status(400).json({ message: 'storeId inválido' });
  if (fromDate > toDate) return res.status(400).json({ message: 'La fecha inicial no puede ser mayor que la final' });

  let productIdArray = [];

  try {
    const productStartId = productStart ? Number(productStart) : null;
    const productEndId = productEnd ? Number(productEnd) : null;

    if (productStartId !== null && productEndId !== null) {
      if (isNaN(productStartId) || isNaN(productEndId)) {
        return res.status(400).json({ message: "IDs de productos inválidos" });
      }
      if (productEndId < productStartId) {
        return res.status(400).json({ message: "El producto final debe ser mayor o igual al inicial" });
      }
      const productosEnRango = await prisma.product.findMany({
        where: { id: { gte: productStartId, lte: productEndId } },
        select: { id: true }
      });
      productIdArray = productosEnRango.map(p => p.id);
    } else if (productIds) {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      productIdArray = ids.map(Number).filter(id => !isNaN(id));
      if (!productIdArray.length) return res.status(400).json({ message: "Todos los productIds deben ser válidos" });
    } else {
      return res.status(400).json({ message: 'Debe especificar productStart y productEnd o al menos un productId' });
    }

    const ventas = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        estado: "EMITIDA",
        storeId: storeIdNum,
        items: { some: { productId: { in: productIdArray } } },
      },
      select: {
        items: {
          where: { productId: { in: productIdArray } },
          select: {
            quantity: true,
            priceBase: true,
            product: { select: { id: true, name: true, costBase: true } }
          }
        }
      }
    });

    const utilidadPorProducto = {};

    ventas.forEach(v => {
      v.items.forEach(item => {
        const key = item.product.id;
        const cantidad = item.quantity;
        const precioUnit = item.priceBase ?? 0;
        const costoUnit = item.product.costBase ?? 0;
        const precioTotal = cantidad * precioUnit;
        const costoTotal = cantidad * costoUnit;
        const utilidad = precioTotal - costoTotal;

        if (!utilidadPorProducto[key]) {
          utilidadPorProducto[key] = {
            productoId: key,
            producto: item.product.name,
            cantidad: 0,
            precioTotal: 0,
            costoTotal: 0,
            utilidad: 0,
            precioUnitario: 0,
            costoUnitario: 0
          };
        }

        utilidadPorProducto[key].cantidad += cantidad;
        utilidadPorProducto[key].precioTotal += precioTotal;
        utilidadPorProducto[key].costoTotal += costoTotal;
        utilidadPorProducto[key].utilidad += utilidad;
      });
    });

    const rows = Object.values(utilidadPorProducto).map(p => {
      const precioUnitario = p.cantidad ? p.precioTotal / p.cantidad : 0;
      const costoUnitario = p.cantidad ? p.costoTotal / p.cantidad : 0;

      return {
        productoId: p.productoId,
        producto: p.producto,
        cantidad: p.cantidad,
        precioUnitario: parseFloat(precioUnitario.toFixed(2)),
        costoUnitario: parseFloat(costoUnitario.toFixed(2)),
        precioTotal: parseFloat(p.precioTotal.toFixed(2)),
        costoTotal: parseFloat(p.costoTotal.toFixed(2)),
        utilidad: parseFloat(p.utilidad.toFixed(2)),
        porcentajeUtilidad: p.costoTotal === 0 ? 100 : parseFloat(((p.utilidad / p.costoTotal) * 100).toFixed(2))
      };
    });

    res.json(rows);

  } catch (err) {
    console.error("Error generando reporte de utilidad:", err);
    res.status(500).json({ message: 'Error al generar el reporte de utilidad por producto' });
  }
});

router.get("/kardex-producto", async (req, res) => {
  const prisma = getPrisma();
  try {
    const { from, to, storeId, productId } = req.query;

    if (!from || !to || !storeId || !productId) {
      return res.status(400).json({
        error: "Parámetros requeridos: from, to, storeId, productId",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const storeID = Number(storeId);
    const productID = Number(productId);

    const producto = await prisma.product.findUnique({
      where: { id: productID },
      select: { id: true, name: true, quantity: true },
    });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [
      comprasPrevias,
      ventasPrevias,
      ventasCanceladasPrevias,
      comprasCanceladasPrevias,
    ] = await Promise.all([
      prisma.purchaseItem.aggregate({
        _sum: { quantity: true },
        where: {
          productId: productID,
          purchase: {
            storeId: storeID,
            estado: "EMITIDA",
            createdAt: { lt: fromDate },
          },
        },
      }),
      prisma.invoiceItem.aggregate({
        _sum: { quantity: true },
        where: {
          productId: productID,
          invoice: {
            storeId: storeID,
            estado: "EMITIDA",
            createdAt: { lt: fromDate },
          },
        },
      }),
      prisma.invoiceItem.aggregate({
        _sum: { quantity: true },
        where: {
          productId: productID,
          invoice: {
            storeId: storeID,
            estado: "CANCELADA",
            createdAt: { lt: fromDate },
          },
        },
      }),
      prisma.purchaseItem.aggregate({
        _sum: { quantity: true },
        where: {
          productId: productID,
          purchase: {
            storeId: storeID,
            estado: "CANCELADA",
            createdAt: { lt: fromDate },
          },
        },
      }),
    ]);

    const saldoInicial =
      (comprasPrevias._sum.quantity || 0) -
      (ventasPrevias._sum.quantity || 0);

    const [compras, ventas] = await Promise.all([
      prisma.purchaseItem.findMany({
        where: {
          productId: productID,
          purchase: {
            storeId: storeID,
            createdAt: { gte: fromDate, lte: toDate },
            estado: { in: ["EMITIDA", "CANCELADA"] },
          },
        },
        include: { purchase: { include: { caja: true } } },
      }),
      prisma.invoiceItem.findMany({
        where: {
          productId: productID,
          invoice: {
            storeId: storeID,
            createdAt: { gte: fromDate, lte: toDate },
            estado: { in: ["EMITIDA", "CANCELADA"] },
          },
        },
        include: { invoice: { include: { caja: true } } },
      }),
    ]);

    const movimientosSinExistencia = [];

    const agregarMovimiento = (fecha, tipo, referencia, caja, entradas, salidas) => {
      movimientosSinExistencia.push({
        _datetime: fecha,
        fecha: fecha.toISOString().split("T")[0],
        tipo,
        referencia: referencia || "-",
        caja: caja || "N/A",
        entradas,
        salidas,
      });
    };

    agregarMovimiento(fromDate, "SALDO INICIAL", "-", "-", 0, 0);

    compras.forEach((item) => {
      const doc = item.purchase;
      const cantidad = item.quantity;
      const ref = doc.folio || String(doc.id).padStart(5, "0");

      if (doc.estado === "CANCELADA") {
        agregarMovimiento(doc.createdAt, "COMPRA", ref, doc.caja?.descripcion, cantidad, 0);
        agregarMovimiento(doc.createdAt, "COMPRA CANCELADA", ref, doc.caja?.descripcion, 0, cantidad);
      } else {
        agregarMovimiento(doc.createdAt, "COMPRA", ref, doc.caja?.descripcion, cantidad, 0);
      }
    });

    ventas.forEach((item) => {
      const doc = item.invoice;
      const cantidad = item.quantity;
      const ref = doc.folio || String(doc.id).padStart(5, "0");

      if (doc.estado === "CANCELADA") {
        agregarMovimiento(doc.createdAt, "VENTA", ref, doc.caja?.descripcion, 0, cantidad);
        agregarMovimiento(doc.createdAt, "VENTA CANCELADA", ref, doc.caja?.descripcion, cantidad, 0);
      } else {
        agregarMovimiento(doc.createdAt, "VENTA", ref, doc.caja?.descripcion, 0, cantidad);
      }
    });

    movimientosSinExistencia.sort((a, b) => new Date(a._datetime) - new Date(b._datetime));

    const movimientos = [];
    let existencia = saldoInicial;
    let totalEntradas = 0;
    let totalSalidas = 0;

    for (const mov of movimientosSinExistencia) {
      existencia += mov.entradas - mov.salidas;
      totalEntradas += mov.entradas;
      totalSalidas += mov.salidas;

      movimientos.push({
        fecha: mov.fecha,
        tipo: mov.tipo,
        referencia: mov.referencia,
        caja: mov.caja,
        entradas: mov.entradas,
        salidas: mov.salidas,
        existencia,
      });
    }

    const coincide = existencia === producto.quantity;
    const diferenciaExistencia = existencia - producto.quantity;

    return res.json({
      producto: { id: producto.id, nombre: producto.name },
      periodo: { desde: from, hasta: to },
      saldoInicial,
      totalEntradas,
      totalSalidas,
      existenciaFinal: existencia,
      existenciaSistema: producto.quantity,
      diferenciaExistencia,
      coincide,
      movimientos,
    });
  } catch (error) {
    console.error("Error en /kardex-producto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get('/datos', async (req, res) => {
  const prisma = getPrisma();
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: 'Debe especificar los parámetros from y to (YYYY-MM-DD)' });
  }
  try {
    const ventas = await prisma.invoice.findMany({
      where: { createdAt: { gte: new Date(from), lte: new Date(to) }, estado: "EMITIDA" },
      include: { client: true },
      orderBy: { createdAt: 'asc' }
    });
    const compras = await prisma.purchase.findMany({
      where: { createdAt: { gte: new Date(from), lte: new Date(to) }, estado: "EMITIDA" },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ ventas, compras });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
});

module.exports = router;
