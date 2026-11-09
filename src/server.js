const app = require('./app');
const db = require('./db');
const { port } = require('./config');

const server = app.listen(port, () => {
  console.log(`API disponible en http://localhost:${port}`);
  console.log(`Base de datos SQLite: ${db.name}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);