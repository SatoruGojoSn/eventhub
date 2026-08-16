const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  serviceName: 'participants-service',
  port: toInt(process.env.PORT, 3002),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER ?? 'eventhub',
    password: process.env.DB_PASSWORD ?? 'eventhub',
    database: process.env.DB_NAME ?? 'eventhub_participants',
    maxPoolSize: toInt(process.env.DB_POOL_MAX, 10)
  }
};

export const PARTICIPANT_TYPES = ['etudiant', 'professeur', 'externe'];
