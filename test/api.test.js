const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-api-'));
process.env.DB_PATH = path.join(testDirectory, 'test.sqlite');
process.env.JWT_SECRET = 'secreto-de-prueba-con-mas-de-32-caracteres';
process.env.JWT_EXPIRES_IN = '1h';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const db = require('../src/db');
const app = require('../src/app');

let token;

before(async () => {
  const passwordHash = await bcrypt.hash('clave-de-prueba', 4);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('estudiante', passwordHash);
});

after(() => {
  db.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('login emite JWT y rechaza credenciales incorrectas', async () => {
  const validLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'estudiante', password: 'clave-de-prueba' });
  assert.equal(validLogin.status, 200);
  assert.equal(validLogin.body.token_type, 'Bearer');
  assert.ok(validLogin.body.token);
  token = validLogin.body.token;

  const invalidLogin = await request(app)
    .post('/auth/login')
    .send({ username: 'estudiante', password: 'incorrecta' });
  assert.equal(invalidLogin.status, 401);
});

test('CRUD exige JWT, valida datos y persiste las operaciones', async () => {
  const unauthorized = await request(app).get('/products');
  assert.equal(unauthorized.status, 401);

  const invalidToken = await request(app).get('/products').set('Authorization', 'Bearer token-invalido');
  assert.equal(invalidToken.status, 401);

  const expiredToken = jwt.sign({ sub: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
  const expired = await request(app).get('/products').set('Authorization', `Bearer ${expiredToken}`);
  assert.equal(expired.status, 401);

  const invalidProduct = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Sin precio' });
  assert.equal(invalidProduct.status, 400);

  const created = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Cuaderno', description: 'Tapa dura', price: 4.5, is_favorite: true });
  assert.equal(created.status, 201);
  const productId = created.body.id;
  assert.equal(created.body.is_favorite, true);
  assert.equal(db.prepare('SELECT name FROM products WHERE id = ?').get(productId).name, 'Cuaderno');

  const list = await request(app).get('/products').set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);

  const favorites = await request(app).get('/products?favorite=true').set('Authorization', `Bearer ${token}`);
  assert.equal(favorites.status, 200);
  assert.equal(favorites.body.length, 1);
  assert.equal(favorites.body[0].is_favorite, true);

  const detail = await request(app).get(`/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.name, 'Cuaderno');

  const updated = await request(app)
    .put(`/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ price: 5 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.price, 5);
  assert.equal(db.prepare('SELECT price FROM products WHERE id = ?').get(productId).price, 5);

  const unfavorited = await request(app)
    .put(`/products/${productId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ is_favorite: false });
  assert.equal(unfavorited.status, 200);
  assert.equal(unfavorited.body.is_favorite, false);

  const favoritesAfterUpdate = await request(app)
    .get('/products?favorite=true')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(favoritesAfterUpdate.body.length, 0);

  const deleted = await request(app).delete(`/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(deleted.status, 204);
  assert.equal(db.prepare('SELECT id FROM products WHERE id = ?').get(productId), undefined);

  const missing = await request(app).get(`/products/${productId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(missing.status, 404);
});