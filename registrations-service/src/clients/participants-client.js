import { config } from '../config.js';
import { createHttpClient } from './http-client.js';

/**
 * Client REST vers participants-service.
 */
export function createParticipantsClient({
  baseUrl = config.participantsServiceUrl,
  fetchImpl = fetch
} = {}) {
  const http = createHttpClient({
    baseUrl,
    serviceLabel: 'participants-service',
    fetchImpl
  });

  return {
    /** @returns {Promise<object|null>} le participant ou null s'il n'existe pas */
    getParticipant(participantId) {
      return http.getJson(`/participants/${participantId}`);
    }
  };
}
