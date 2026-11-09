const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres en el archivo .env.');
}

module.exports = {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  port: Number(process.env.PORT) || 3000,
  databasePath: path.resolve(process.cwd(), process.env.DB_PATH || 'data/workshop.sqlite'),
};