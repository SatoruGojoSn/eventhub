import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { ApiError } from './errors.js';
import {
  createEventRegistrationsRouter,
  createParticipantEventsRouter,
  createRegistrationsRouter
} from './routes/registrations.js';
import { createRegistrationService } from './services/registration-service.js';

export function createApp({ repository, eventsClient, participantsClient }) {
  const app = express();
  const service = createRegistrationService({
    repository,
    eventsClient,
    participantsClient
  });

  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      console.log(
        `[${config.serviceName}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
      );
    });
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: config.serviceName });
  });

  app.get('/ready', async (req, res) => {
    try {
      await repository.healthCheck();
      res.json({ status: 'READY', service: config.serviceName, database: 'UP' });
    } catch (error) {
      res.status(503).json({
        status: 'NOT_READY',
        service: config.serviceName,
        database: 'DOWN',
        message: error.message
      });
    }
  });

  app.use('/registrations', createRegistrationsRouter({ repository, service }));
  app.use('/events', createEventRegistrationsRouter({ service }));
  app.use('/participants', createParticipantEventsRouter({ service }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Route introuvable', path: req.originalUrl });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    const status = error instanceof ApiError ? error.status : error.status ?? error.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return res.status(status).json({ error: error.message, details: error.details });
    }
    console.error(`[${config.serviceName}] Erreur non geree`, error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  });

  return app;
}
