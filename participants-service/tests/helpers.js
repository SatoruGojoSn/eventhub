import { createApp } from '../src/app.js';
import { createInMemoryParticipantRepository } from '../src/repositories/in-memory-participant-repository.js';

export async function startTestServer({ seed = [] } = {}) {
  const repository = createInMemoryParticipantRepository(seed);
  const app = createApp({ repository });

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

export const sampleParticipants = [
  {
    fullName: 'Awa Diop',
    email: 'awa.diop@dit.sn',
    phone: '+221 77 123 45 67',
    type: 'etudiant'
  },
  {
    fullName: 'Moussa Ndiaye',
    email: 'moussa.ndiaye@dit.sn',
    phone: '+221 76 987 65 43',
    type: 'professeur'
  },
  {
    fullName: 'Fatou Sall',
    email: 'fatou.sall@externe.com',
    phone: null,
    type: 'externe'
  }
];
