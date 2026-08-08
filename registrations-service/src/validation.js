import { badRequest } from './errors.js';

export function parseId(rawId, label = 'Identifiant') {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`${label} invalide: ${rawId}`);
  }
  return id;
}

/**
 * Valide le corps d'une demande d'inscription.
 */
export function validateRegistrationPayload(body) {
  const errors = [];
  const source = body ?? {};

  const eventId = Number(source.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    errors.push('eventId doit etre un entier strictement positif');
  }

  const participantId = Number(source.participantId);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    errors.push('participantId doit etre un entier strictement positif');
  }

  if (errors.length > 0) {
    throw badRequest('Donnees d inscription invalides', errors);
  }

  return { eventId, participantId };
}
