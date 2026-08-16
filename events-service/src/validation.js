import { badRequest } from './errors.js';

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === '';

/**
 * Valide le payload d'un evenement.
 * @param {object} body corps de la requete
 * @param {{ partial?: boolean }} options `partial: true` pour une mise a jour (PUT/PATCH)
 * @returns {{ title, description, eventDate, location, capacity }} champs valides
 */
export function validateEventPayload(body, { partial = false } = {}) {
  const errors = [];
  const payload = {};
  const source = body ?? {};

  const has = (field) => Object.prototype.hasOwnProperty.call(source, field);

  if (!partial || has('title')) {
    if (isBlank(source.title)) {
      errors.push('title est obligatoire');
    } else if (String(source.title).trim().length > 200) {
      errors.push('title ne doit pas depasser 200 caracteres');
    } else {
      payload.title = String(source.title).trim();
    }
  }

  if (!partial || has('description')) {
    payload.description = isBlank(source.description)
      ? null
      : String(source.description).trim();
  }

  if (!partial || has('eventDate')) {
    const raw = source.eventDate ?? source.date;
    if (isBlank(raw)) {
      errors.push('eventDate est obligatoire');
    } else {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('eventDate doit etre une date ISO valide');
      } else {
        payload.eventDate = parsed.toISOString();
      }
    }
  }

  if (!partial || has('location')) {
    if (isBlank(source.location)) {
      errors.push('location est obligatoire');
    } else {
      payload.location = String(source.location).trim();
    }
  }

  if (!partial || has('capacity')) {
    const capacity = Number(source.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      errors.push('capacity doit etre un entier strictement positif');
    } else {
      payload.capacity = capacity;
    }
  }

  if (errors.length > 0) {
    throw badRequest('Donnees de l evenement invalides', errors);
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
