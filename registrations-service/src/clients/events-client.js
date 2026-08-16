import { config } from '../config.js';
import { createHttpClient } from './http-client.js';

/**
 * Client REST vers events-service.
 * registrations-service ne connait pas la table `events` : il doit passer
 * par l'API du service proprietaire de la donnee.
 */
export function createEventsClient({
  baseUrl = config.eventsServiceUrl,
  fetchImpl = fetch
} = {}) {
  const http = createHttpClient({
    baseUrl,
    serviceLabel: 'events-service',
    fetchImpl
  });

  return {
    /** @returns {Promise<object|null>} l'evenement ou null s'il n'existe pas */
    getEvent(eventId) {
      return http.getJson(`/events/${eventId}`);
    }
  };
}
