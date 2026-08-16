import { Router } from 'express';
import { REGISTRATION_STATUS } from '../config.js';
import { badRequest, notFound } from '../errors.js';
import { parseId, validateRegistrationPayload } from '../validation.js';

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const parseStatus = (raw) => {
  if (!raw) return undefined;
  const status = String(raw).toUpperCase();
  if (!Object.values(REGISTRATION_STATUS).includes(status)) {
    throw badRequest(
      `status doit valoir : ${Object.values(REGISTRATION_STATUS).join(', ')}`
    );
  }
  return status;
};

export function createRegistrationsRouter({ repository, service }) {
  const router = Router();

  // POST /registrations : inscrire un participant a un evenement
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const payload = validateRegistrationPayload(req.body);
      const registration = await service.register(payload);
      res.status(201).json(registration);
    })
  );

  // GET /registrations : liste filtrable
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const registrations = await repository.findAll({
        eventId: req.query.eventId ? parseId(req.query.eventId, 'eventId') : undefined,
        participantId: req.query.participantId
          ? parseId(req.query.participantId, 'participantId')
          : undefined,
        status: parseStatus(req.query.status)
      });
      res.json({ count: registrations.length, data: registrations });
    })
  );

  // GET /registrations/stats : statistiques globales (total, par evenement)
  // Declaree avant /:id pour ne pas etre capturee par la route parametree.
  router.get(
    '/stats',
    asyncHandler(async (req, res) => {
      res.json(await service.stats());
    })
  );

  // GET /registrations/stats/events/:eventId : compteur d'un evenement.
  // Endpoint consomme par events-service pour calculer les places restantes.
  router.get(
    '/stats/events/:eventId',
    asyncHandler(async (req, res) => {
      const eventId = parseId(req.params.eventId, 'eventId');
      res.json(await repository.statsByEvent(eventId));
    })
  );

  // GET /registrations/availability/:eventId : detection de places disponibles
  router.get(
    '/availability/:eventId',
    asyncHandler(async (req, res) => {
      const eventId = parseId(req.params.eventId, 'eventId');
      res.json(await service.checkAvailability(eventId));
    })
  );

  // GET /registrations/by-event/:eventId : inscriptions d'un evenement.
  // Alias de /events/:eventId/registrations, dans le namespace /registrations
  // afin que la passerelle Nginx n'ait qu'un seul prefixe a router par service.
  router.get(
    '/by-event/:eventId',
    asyncHandler(async (req, res) => {
      const eventId = parseId(req.params.eventId, 'eventId');
      res.json(
        await service.listByEvent(eventId, { status: parseStatus(req.query.status) })
      );
    })
  );

  // GET /registrations/by-participant/:participantId : evenements d'un participant
  router.get(
    '/by-participant/:participantId',
    asyncHandler(async (req, res) => {
      const participantId = parseId(req.params.participantId, 'participantId');
      res.json(
        await service.listEventsOfParticipant(participantId, {
          status: parseStatus(req.query.status)
        })
      );
    })
  );

  // GET /registrations/:id : detail d'une inscription
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const registration = await repository.findById(id);
      if (!registration) throw notFound(`Inscription ${id} introuvable`);
      res.json(registration);
    })
  );

  // DELETE /registrations/:id : annulation (soft delete, statut CANCELLED)
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const registration = await service.cancel(id);
      res.json({ message: 'Inscription annulee', registration });
    })
  );

  return router;
}

/** Routes de consultation croisee : /events/:eventId/registrations */
export function createEventRegistrationsRouter({ service }) {
  const router = Router();

  router.get(
    '/:eventId/registrations',
    asyncHandler(async (req, res) => {
      const eventId = parseId(req.params.eventId, 'eventId');
      const result = await service.listByEvent(eventId, {
        status: parseStatus(req.query.status)
      });
      res.json(result);
    })
  );

  return router;
}

/** Routes de consultation croisee : /participants/:participantId/events */
export function createParticipantEventsRouter({ service }) {
  const router = Router();

  router.get(
    '/:participantId/events',
    asyncHandler(async (req, res) => {
      const participantId = parseId(req.params.participantId, 'participantId');
      const result = await service.listEventsOfParticipant(participantId, {
        status: parseStatus(req.query.status)
      });
      res.json(result);
    })
  );

  return router;
}
