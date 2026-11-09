const { Router } = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = Router();
const productFields = new Set(['name', 'description', 'price', 'is_favorite']);

function serializeProduct(product) {
  return { ...product, is_favorite: Boolean(product.is_favorite) };
}

function validateProduct(body, { creating = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'El cuerpo debe ser un objeto JSON.';
  }

  if (Object.keys(body).some((field) => !productFields.has(field))) {
    return 'El cuerpo contiene campos no permitidos.';
  }

  if (creating && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'name es obligatorio y debe ser un texto no vacío.';
  }
  if (creating && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    return 'price es obligatorio y debe ser un número mayor o igual a 0.';
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'name debe ser un texto no vacío.';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description debe ser un texto.';
  }
  if (body.is_favorite !== undefined && typeof body.is_favorite !== 'boolean') {
    return 'is_favorite debe ser true o false.';
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    return 'price debe ser un número mayor o igual a 0.';
  }
  if (!creating && Object.keys(body).length === 0) {
    return 'Envía al menos un campo para actualizar.';
  }

  return null;
}

router.use(requireAuth);

router.post('/', (req, res) => {
  const validationError = validateProduct(req.body, { creating: true });
  if (validationError) return res.status(400).json({ error: validationError });

  const result = db.prepare(
    'INSERT INTO products (name, description, price, is_favorite) VALUES (?, ?, ?, ?)',
  ).run(req.body.name.trim(), req.body.description || '', req.body.price, req.body.is_favorite ? 1 : 0);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json(serializeProduct(product));
});

router.get('/', (req, res) => {
  const favorite = req.query.favorite;
  if (favorite !== undefined && favorite !== 'true' && favorite !== 'false') {
    return res.status(400).json({ error: 'favorite debe ser true o false.' });
  }

  const products = favorite === undefined
    ? db.prepare('SELECT * FROM products ORDER BY id').all()
    : db.prepare('SELECT * FROM products WHERE is_favorite = ? ORDER BY id').all(favorite === 'true' ? 1 : 0);
  return res.status(200).json(products.map(serializeProduct));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

  return res.status(200).json(serializeProduct(product));
});

router.put('/:id', (req, res) => {
  const validationError = validateProduct(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado.' });

  const updated = {
    name: req.body.name === undefined ? existing.name : req.body.name.trim(),
    description: req.body.description === undefined ? existing.description : req.body.description,
    price: req.body.price === undefined ? existing.price : req.body.price,
    is_favorite: req.body.is_favorite === undefined ? existing.is_favorite : Number(req.body.is_favorite),
  };
  db.prepare('UPDATE products SET name = ?, description = ?, price = ?, is_favorite = ? WHERE id = ?')
    .run(updated.name, updated.description, updated.price, updated.is_favorite, req.params.id);

  return res.status(200).json(serializeProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

  return res.status(204).end();
});

module.exports = router;