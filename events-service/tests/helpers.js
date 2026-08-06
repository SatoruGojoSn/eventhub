import { createApp } from '../src/app.js';
import { createInMemoryEventRepository } from '../src/repositories/in-memory-event-repository.js';

/**
 * Demarre l'application sur un port libre et renvoie un client HTTP minimal.
 * Aucune base de donnees n'est requise : le depot en memoire est injecte.
 */
export async function startTestServer({ seed = [], registrationsClient } = {}) {
  const repository = createInMemoryEventRepository(seed);

  const defaultClient = {
    async countConfirmedForEvent() {
      return 0;
    }
  };

  const app = createApp({
    repository,
    registrationsClient: registrationsClient ?? defaultClient
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    return { status: response.status, body: payload };
  };

  return {
    repository,
    baseUrl,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

export const sampleEvent = {
  title: 'Conference IA & Afrique',
  description: 'Conference annuelle du DIT sur l intelligence artificielle',
  eventDate: '2026-09-15T09:00:00.000Z',
  location: 'Amphitheatre A - DIT Dakar',
  capacity: 120
};
