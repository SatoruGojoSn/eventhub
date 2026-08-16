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
    console.error('[participants-service] Erreur inattendue du pool PostgreSQL', error);
  });

  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS participants (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(150) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(30),
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('etudiant', 'professeur', 'externe')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_full_name ON participants (full_name);
CREATE INDEX IF NOT EXISTS idx_participants_type      ON participants (type);
`;

export async function runMigrations(pool) {
  await pool.query(SCHEMA);
  console.log('[participants-service] Schema verifie / cree');
}

export async function waitForDatabase(pool, { retries = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(
        `[participants-service] PostgreSQL indisponible (tentative ${attempt}/${retries}) : ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
