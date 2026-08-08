const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const config = {
  serviceName: 'registrations-service',
  port: toInt(process.env.PORT, 3003),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER ?? 'eventhub',
    password: process.env.DB_PASSWORD ?? 'eventhub',
    database: process.env.DB_NAME ?? 'eventhub_registrations',
    maxPoolSize: toInt(process.env.DB_POOL_MAX, 10)
  },
  eventsServiceUrl: process.env.EVENTS_SERVICE_URL ?? 'http://localhost:3001',
  participantsServiceUrl:
    process.env.PARTICIPANTS_SERVICE_URL ?? 'http://localhost:3002',
  httpTimeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 3000)
};

export const REGISTRATION_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED'
};
