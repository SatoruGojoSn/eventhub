const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  serviceName: 'events-service',
  port: toInt(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER ?? 'eventhub',
    password: process.env.DB_PASSWORD ?? 'eventhub',
    database: process.env.DB_NAME ?? 'eventhub_events',
    maxPoolSize: toInt(process.env.DB_POOL_MAX, 10)
  },
  registrationsServiceUrl:
    process.env.REGISTRATIONS_SERVICE_URL ?? 'http://localhost:3003',
  httpTimeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 3000)
};
