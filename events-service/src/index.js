import { createApp } from './app.js';
import { createRegistrationsClient } from './clients/registrations-client.js';
import { config } from './config.js';
import { createPool, runMigrations, waitForDatabase } from './db/pool.js';
import { createPostgresEventRepository } from './repositories/postgres-event-repository.js';

async function bootstrap() {
  const pool = createPool();
  await waitForDatabase(pool);
  await runMigrations(pool);

  const app = createApp({
    repository: createPostgresEventRepository(pool),
    registrationsClient: createRegistrationsClient()
  });

  const server = app.listen(config.port, () => {
    console.log(
      `[${config.serviceName}] demarre sur le port ${config.port} (env=${config.nodeEnv})`
    );
  });

  // Arret propre : indispensable pour un conteneur (SIGTERM envoye par Docker).
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
