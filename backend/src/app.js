const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const prisma = require('./prisma');

const app = express();

app.use(morgan(process.env.NODE_ENV === 'production' ? 'production' : 'development'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const inventoryStockRoutes = require('./routes/inventory');     
const inventoryOpsRoutes = require('./routes/inventario');      

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clients'));
app.use('/api/proveedores', require('./routes/suppliers'));
app.use('/api/ventas', require('./routes/invoices'));
app.use('/api/compras', require('./routes/purchase'));
app.use('/api/inventario', inventoryStockRoutes);
app.use('/api/inventarios', inventoryOpsRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/usuarios', require('./routes/users'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/taxes', require('./routes/taxes'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/categorias', require('./routes/categories'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/cash-registers', require('./routes/cashRegisters'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/respaldo', require('./routes/backup'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/permissions', require('./routes/permissions'));

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Error interno del servidor',
  });
});

process.on('SIGINT', async () => {
  console.log('Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;