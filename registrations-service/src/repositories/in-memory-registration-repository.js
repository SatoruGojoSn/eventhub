import { REGISTRATION_STATUS } from '../config.js';

/**
 * Depot en memoire des inscriptions (utilise par les tests unitaires).
 */
export function createInMemoryRegistrationRepository(seed = []) {
  let sequence = 0;
  const rows = new Map();

  const clone = (registration) => ({ ...registration });

  const insert = (data) => {
    sequence += 1;
    const registration = {
      id: sequence,
      eventId: data.eventId,
      participantId: data.participantId,
      status: data.status ?? REGISTRATION_STATUS.CONFIRMED,
      registeredAt: data.registeredAt ?? new Date().toISOString(),
      cancelledAt: data.cancelledAt ?? null
    };
    rows.set(registration.id, registration);
    return clone(registration);
  };

  seed.forEach(insert);

  const confirmed = () =>
    [...rows.values()].filter((row) => row.status === REGISTRATION_STATUS.CONFIRMED);

  return {
    async create({ eventId, participantId }) {
      return insert({ eventId, participantId });
    },

    async findAll(filters = {}) {
      let list = [...rows.values()];

      if (filters.eventId) {
        list = list.filter((row) => row.eventId === filters.eventId);
      }
      if (filters.participantId) {
        list = list.filter((row) => row.participantId === filters.participantId);
      }
      if (filters.status) {
        list = list.filter((row) => row.status === filters.status);
      }

      return list.sort((a, b) => b.id - a.id).map(clone);
    },

    async findById(id) {
      const registration = rows.get(id);
      return registration ? clone(registration) : null;
    },

    async findConfirmed(eventId, participantId) {
      const registration = confirmed().find(
        (row) => row.eventId === eventId && row.participantId === participantId
      );
      return registration ? clone(registration) : null;
    },

    async cancel(id) {
      const registration = rows.get(id);
      if (!registration || registration.status === REGISTRATION_STATUS.CANCELLED) {
        return null;
      }
      const updated = {
        ...registration,
        status: REGISTRATION_STATUS.CANCELLED,
        cancelledAt: new Date().toISOString()
      };
      rows.set(id, updated);
      return clone(updated);
    },

    async countConfirmedByEvent(eventId) {
      return confirmed().filter((row) => row.eventId === eventId).length;
    },

    async statsByEvent(eventId) {
      const all = [...rows.values()].filter((row) => row.eventId === eventId);
      return {
        eventId,
        total: all.length,
        confirmed: all.filter((row) => row.status === REGISTRATION_STATUS.CONFIRMED).length,
        cancelled: all.filter((row) => row.status === REGISTRATION_STATUS.CANCELLED).length
      };
    },

    async globalStats() {
      const all = [...rows.values()];
      const byEventMap = new Map();

      for (const row of all) {
        const entry = byEventMap.get(row.eventId) ?? {
          eventId: row.eventId,
          total: 0,
          confirmed: 0,
          cancelled: 0
        };
        entry.total += 1;
        if (row.status === REGISTRATION_STATUS.CONFIRMED) entry.confirmed += 1;
        else entry.cancelled += 1;
        byEventMap.set(row.eventId, entry);
      }

      return {
        total: all.length,
        confirmed: all.filter((row) => row.status === REGISTRATION_STATUS.CONFIRMED).length,
        cancelled: all.filter((row) => row.status === REGISTRATION_STATUS.CANCELLED).length,
        distinctEvents: byEventMap.size,
        distinctParticipants: new Set(all.map((row) => row.participantId)).size,
        byEvent: [...byEventMap.values()].sort((a, b) => b.confirmed - a.confirmed)
      };
    },

    async healthCheck() {
      return true;
    }
  };
}
