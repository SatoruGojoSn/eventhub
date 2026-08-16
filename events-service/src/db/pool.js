import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export function createPool() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    max: config.database.maxPoolSize
  });

  pool.on('error', (error) => {
    console.error('[events-service] Erreur inattendue du pool PostgreSQL', error);
  });

  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  event_date  TIMESTAMPTZ  NOT NULL,
  location    VARCHAR(200) NOT NULL,
  capacity    INTEGER      NOT NULL CHECK (capacity > 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_date ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_location   ON events (location);
`;

/**
 * Migration minimaliste executee au demarrage du service.
 * Chaque microservice possede sa propre base : il est donc proprietaire
 * exclusif de son schema (pattern "database per service").
 */
export async function runMigrations(pool) {
  await pool.query(SCHEMA);
  console.log('[events-service] Schema verifie / cree');
}

/**
 * Attend que PostgreSQL soit joignable (utile avec docker-compose ou le
 * demarrage simultane des conteneurs).
 */
export async function waitForDatabase(pool, { retries = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(
        `[events-service] PostgreSQL indisponible (tentative ${attempt}/${retries}) : ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
