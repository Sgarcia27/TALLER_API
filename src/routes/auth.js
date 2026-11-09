const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret, jwtExpiresIn } = require('../config');

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username y password son obligatorios.' });
  }

  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
  const passwordMatches = user && await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, jwtSecret, { expiresIn: jwtExpiresIn });
  return res.status(200).json({ token, token_type: 'Bearer', expires_in: jwtExpiresIn });
});

module.exports = router;