import { createApp } from './app.js';
import { config } from './config.js';
import { createPool, runMigrations, waitForDatabase } from './db/pool.js';
import { createPostgresParticipantRepository } from './repositories/postgres-participant-repository.js';

async function bootstrap() {
  const pool = createPool();
  await waitForDatabase(pool);
  await runMigrations(pool);

  const app = createApp({ repository: createPostgresParticipantRepository(pool) });

  const server = app.listen(config.port, () => {
    console.log(
      `[${config.serviceName}] demarre sur le port ${config.port} (env=${config.nodeEnv})`
    );
  });

  const shutdown = async (signal) => {
    console.log(`[${config.serviceName}] Signal ${signal} recu, arret en cours...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error(`[${config.serviceName}] Echec du demarrage`, error);
  process.exit(1);
});
