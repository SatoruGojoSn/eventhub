import { Router } from 'express';
import { badRequest, notFound } from '../errors.js';
import { parseId, validateParticipantPayload } from '../validation.js';

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function createParticipantsRouter({ repository }) {
  const router = Router();

  // POST /participants : creation d'un compte participant
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const payload = validateParticipantPayload(req.body);
      const participant = await repository.create(payload);
      res.status(201).json(participant);
    })
  );

  // GET /participants : liste avec filtres (type, email, nom, recherche globale)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const participants = await repository.findAll({
        type: req.query.type,
        email: req.query.email,
        name: req.query.name,
        search: req.query.search ?? req.query.q
      });
      res.json({ count: participants.length, data: participants });
    })
  );

  // GET /participants/search?email=... ou ?name=...
  // Declaree AVANT /:id pour ne pas etre capturee par la route parametree.
  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      const { email, name, q } = req.query;
      if (!email && !name && !q) {
        throw badRequest('Fournir au moins un critere : email, name ou q');
      }

      // Recherche exacte par email : renvoie directement la ressource.
      if (email && !name && !q) {
        const participant = await repository.findByEmail(String(email).toLowerCase());
        if (participant) {
          return res.json({ count: 1, data: [participant] });
        }
      }

      const participants = await repository.findAll({ email, name, search: q });
      return res.json({ count: participants.length, data: participants });
    })
  );

  // GET /participants/:id : detail
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const participant = await repository.findById(id);
      if (!participant) throw notFound(`Participant ${id} introuvable`);
      res.json(participant);
    })
  );

  // PUT /participants/:id : modification du profil
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const payload = validateParticipantPayload(req.body, { partial: true });
      const participant = await repository.update(id, payload);
      if (!participant) throw notFound(`Participant ${id} introuvable`);
      res.json(participant);
    })
  );

  // DELETE /participants/:id : suppression
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const deleted = await repository.remove(id);
      if (!deleted) throw notFound(`Participant ${id} introuvable`);
      res.status(204).send();
    })
  );

  return router;
}
