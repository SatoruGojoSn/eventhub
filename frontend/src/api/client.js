// Toutes les requetes passent par le prefixe /api, route vers le bon
// microservice par Vite (dev) ou Nginx (production).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? ` (${payload.details.join(' ; ')})` : '';
    throw new Error(`${payload?.error ?? `Erreur HTTP ${response.status}`}${details}`);
  }

  return payload;
}

export const eventsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value)
    );
    const query = params.toString();
    return request(`/events${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/events/${id}`),
  create: (body) => request('/events', { method: 'POST', body }),
  update: (id, body) => request(`/events/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/events/${id}`, { method: 'DELETE' })
};

export const participantsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value)
    );
    const query = params.toString();
    return request(`/participants${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/participants/${id}`),
  create: (body) => request('/participants', { method: 'POST', body }),
  update: (id, body) => request(`/participants/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/participants/${id}`, { method: 'DELETE' })
};

export const registrationsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value)
    );
    const query = params.toString();
    return request(`/registrations${query ? `?${query}` : ''}`);
  },
  register: (eventId, participantId) =>
    request('/registrations', {
      method: 'POST',
      body: { eventId: Number(eventId), participantId: Number(participantId) }
    }),
  cancel: (id) => request(`/registrations/${id}`, { method: 'DELETE' }),
  byEvent: (eventId) => request(`/registrations/by-event/${eventId}`),
  byParticipant: (participantId) => request(`/registrations/by-participant/${participantId}`),
  availability: (eventId) => request(`/registrations/availability/${eventId}`),
  stats: () => request('/registrations/stats')
};

// Sondes de sante exposees par la passerelle sous /api/health/<service>.
export const healthApi = {
  async statuses() {
    const services = ['events', 'participants', 'registrations'];
    return Promise.all(
      services.map(async (service) => {
        try {
          const body = await request(`/health/${service}`);
          return { service, status: body?.status ?? 'UP' };
        } catch {
          return { service, status: 'DOWN' };
        }
      })
    );
  }
};
