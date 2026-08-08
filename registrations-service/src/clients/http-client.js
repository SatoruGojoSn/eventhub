import { config } from '../config.js';
import { serviceUnavailable } from '../errors.js';

/**
 * Petit client HTTP partage par les clients inter-services.
 * - renvoie `null` sur un 404 (ressource absente, cas fonctionnel normal)
 * - leve une ApiError 503 si le service distant est injoignable ou en erreur
 */
export function createHttpClient({
  baseUrl,
  serviceLabel,
  timeoutMs = config.httpTimeoutMs,
  fetchImpl = fetch
}) {
  return {
    async getJson(path) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          signal: controller.signal
        });

        if (response.status === 404) return null;

        if (!response.ok) {
          throw serviceUnavailable(`${serviceLabel} a repondu ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        if (error.status) throw error;
        throw serviceUnavailable(`${serviceLabel} injoignable : ${error.message}`);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
