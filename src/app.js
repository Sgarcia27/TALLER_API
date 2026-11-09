const express = require('express');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use('/auth', authRoutes);
app.use('/products', productRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo de la petición no contiene JSON válido.' });
  }
  return res.status(500).json({ error: 'Ocurrió un error interno.' });
});

module.exports = app;