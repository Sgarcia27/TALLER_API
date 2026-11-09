require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function initialize() {
  const username = process.env.INITIAL_USERNAME;
  const password = process.env.INITIAL_PASSWORD;

  if (!username || !password || password.length < 8) {
    throw new Error('Define INITIAL_USERNAME e INITIAL_PASSWORD (mínimo 8 caracteres) en .env.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`La cuenta de prueba "${username}" ya existe; no se modificó.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  console.log(`Base de datos inicializada. Cuenta de prueba creada: ${username}`);
}

initialize()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());