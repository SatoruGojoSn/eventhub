import { createApp } from '../src/app.js';
import { createInMemoryRegistrationRepository } from '../src/repositories/in-memory-registration-repository.js';

export const fakeEvents = {
  1: {
    id: 1,
    title: 'Conference IA & Afrique',
    eventDate: '2026-09-15T09:00:00.000Z',
    location: 'Amphitheatre A - DIT Dakar',
    capacity: 3
  },
  2: {
    id: 2,
    title: 'Atelier Docker',
    eventDate: '2026-09-20T14:00:00.000Z',
    location: 'Salle B - DIT Dakar',
    capacity: 30
  }
};

export const fakeParticipants = {
  1: { id: 1, fullName: 'Awa Diop', email: 'awa.diop@dit.sn', type: 'etudiant' },
  2: { id: 2, fullName: 'Moussa Ndiaye', email: 'moussa.ndiaye@dit.sn', type: 'professeur' },
  3: { id: 3, fullName: 'Fatou Sall', email: 'fatou.sall@externe.com', type: 'externe' },
  4: { id: 4, fullName: 'Ibrahima Fall', email: 'ibrahima.fall@dit.sn', type: 'etudiant' }
};

/** Doubles de test des clients REST vers les deux autres microservices. */
export const createFakeEventsClient = (events = fakeEvents) => ({
  async getEvent(eventId) {
    return events[eventId] ?? null;
  }
});

export const createFakeParticipantsClient = (participants = fakeParticipants) => ({
  async getParticipant(participantId) {
    return participants[participantId] ?? null;
  }
});

export async function startTestServer({
  seed = [],
  eventsClient = createFakeEventsClient(),
  participantsClient = createFakeParticipantsClient()
} = {}) {
  const repository = createInMemoryRegistrationRepository(seed);
  const app = createApp({ repository, eventsClient, participantsClient });

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
