import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

async function startServer() {
  await prisma.$connect();
  const server = app.listen(env.port, () => {
    console.log(`BMF Community API listening on http://localhost:${env.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error: unknown) => {
  console.error('Unable to connect to the database:', error);
  process.exitCode = 1;
});
