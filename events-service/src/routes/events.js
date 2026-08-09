import { Router } from 'express';
import { notFound } from '../errors.js';
import { parseId, validateEventPayload } from '../validation.js';

// Petit wrapper : evite d'ecrire try/catch dans chaque handler.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function createEventsRouter({ repository, registrationsClient }) {
  const router = Router();

  // POST /events : creation d'un evenement
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const payload = validateEventPayload(req.body);
      const event = await repository.create(payload);
      res.status(201).json(event);
    })
  );

  // GET /events : liste avec filtres (date, lieu, recherche plein texte)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const events = await repository.findAll({
        date: req.query.date,
        location: req.query.location,
        from: req.query.from,
        to: req.query.to,
        search: req.query.search ?? req.query.q
      });
      res.json({ count: events.length, data: events });
    })
  );

  // GET /events/:id : detail d'un evenement
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const event = await repository.findById(id);
      if (!event) throw notFound(`Evenement ${id} introuvable`);
      res.json(event);
    })
  );

  // GET /events/:id/availability : places restantes
  router.get(
    '/:id/availability',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const event = await repository.findById(id);
      if (!event) throw notFound(`Evenement ${id} introuvable`);

      const registered = await registrationsClient.countConfirmedForEvent(id);
      const remaining = Math.max(event.capacity - registered, 0);

      res.json({
        eventId: event.id,
        title: event.title,
        capacity: event.capacity,
        registered,
        remaining,
        available: remaining > 0
      });
    })
  );

  // PUT /events/:id : mise a jour (partielle acceptee)
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const payload = validateEventPayload(req.body, { partial: true });
      const event = await repository.update(id, payload);
      if (!event) throw notFound(`Evenement ${id} introuvable`);
      res.json(event);
    })
  );

  // DELETE /events/:id : suppression
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const deleted = await repository.remove(id);
      if (!deleted) throw notFound(`Evenement ${id} introuvable`);
      res.status(204).send();
    })
  );

  return router;
}
