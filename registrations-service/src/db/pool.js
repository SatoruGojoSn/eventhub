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
    console.error('[registrations-service] Erreur inattendue du pool PostgreSQL', error);
  });

  return pool;
}

// Pas de cle etrangere vers events / participants : ces tables vivent dans
// d'autres bases (une base par microservice). L'integrite referentielle est
// verifiee au niveau applicatif via les appels REST.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS registrations (
  id             SERIAL PRIMARY KEY,
  event_id       INTEGER     NOT NULL,
  participant_id INTEGER     NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
                 CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at   TIMESTAMPTZ
);

-- Un participant ne peut avoir qu'une seule inscription CONFIRMED par evenement
-- (index partiel : une inscription annulee n'empeche pas de se reinscrire).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_registration_confirmed
  ON registrations (event_id, participant_id)
  WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_registrations_event       ON registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_participant ON registrations (participant_id);
`;

export async function runMigrations(pool) {
  await pool.query(SCHEMA);
  console.log('[registrations-service] Schema verifie / cree');
}

export async function waitForDatabase(pool, { retries = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(
        `[registrations-service] PostgreSQL indisponible (tentative ${attempt}/${retries}) : ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
