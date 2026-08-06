import { config } from '../config.js';
import { serviceUnavailable } from '../errors.js';

/**
 * Client HTTP vers registrations-service.
 *
 * events-service est proprietaire de la capacite d'un evenement mais pas des
 * inscriptions : il interroge donc registrations-service pour connaitre le
 * nombre de places deja reservees (communication REST inter-services).
 */
export function createRegistrationsClient({
  baseUrl = config.registrationsServiceUrl,
  timeoutMs = config.httpTimeoutMs,
  fetchImpl = fetch
} = {}) {
  return {
    async countConfirmedForEvent(eventId) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(
          `${baseUrl}/registrations/stats/events/${eventId}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw serviceUnavailable(
            `registrations-service a repondu ${response.status}`
          );
        }

        const body = await response.json();
        return Number(body.confirmed ?? body.count ?? 0);
      } catch (error) {
        if (error.status) throw error;
        throw serviceUnavailable(
          `registrations-service injoignable : ${error.message}`
        );
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
