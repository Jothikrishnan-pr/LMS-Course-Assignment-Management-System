const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

(async () => {
  try {
    await connectDB();
    const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
