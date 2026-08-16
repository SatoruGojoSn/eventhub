import { PARTICIPANT_TYPES } from './config.js';
import { badRequest } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,30}$/;

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === '';

/**
 * Valide le payload d'un participant.
 * @param {object} body corps de la requete
 * @param {{ partial?: boolean }} options `partial: true` pour une mise a jour
 */
export function validateParticipantPayload(body, { partial = false } = {}) {
  const errors = [];
  const payload = {};
  const source = body ?? {};
  const has = (field) => Object.prototype.hasOwnProperty.call(source, field);

  if (!partial || has('fullName') || has('name')) {
    const rawName = source.fullName ?? source.name;
    if (isBlank(rawName)) {
      errors.push('fullName est obligatoire');
    } else if (String(rawName).trim().length > 150) {
      errors.push('fullName ne doit pas depasser 150 caracteres');
    } else {
      payload.fullName = String(rawName).trim();
    }
  }

  if (!partial || has('email')) {
    if (isBlank(source.email)) {
      errors.push('email est obligatoire');
    } else {
      const email = String(source.email).trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        errors.push('email doit avoir un format valide');
      } else {
        payload.email = email;
      }
    }
  }

  if (!partial || has('phone')) {
    if (isBlank(source.phone)) {
      payload.phone = null;
    } else {
      const phone = String(source.phone).trim();
      if (!PHONE_PATTERN.test(phone)) {
        errors.push('phone doit contenir entre 6 et 30 caracteres numeriques');
      } else {
        payload.phone = phone;
      }
    }
  }

  if (!partial || has('type')) {
    if (isBlank(source.type)) {
      errors.push('type est obligatoire');
    } else {
      const type = String(source.type).trim().toLowerCase();
      if (!PARTICIPANT_TYPES.includes(type)) {
        errors.push(`type doit valoir : ${PARTICIPANT_TYPES.join(', ')}`);
      } else {
        payload.type = type;
      }
    }
  }

  if (errors.length > 0) {
    throw badRequest('Donnees du participant invalides', errors);
  }

  if (partial && Object.keys(payload).length === 0) {
    throw badRequest('Aucun champ modifiable fourni');
  }

  return payload;
}

export function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`Identifiant invalide: ${rawId}`);
  }
  return id;
}
