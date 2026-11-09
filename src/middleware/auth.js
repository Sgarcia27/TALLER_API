const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Se requiere un token Bearer válido.' });
  }

  try {
    req.user = jwt.verify(match[1], jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'El token es inválido o ha vencido.' });
  }
}

module.exports = requireAuth;