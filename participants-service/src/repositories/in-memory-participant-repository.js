import { conflict } from '../errors.js';

/**
 * Depot en memoire, utilise par les tests unitaires.
 * Il reproduit la contrainte d'unicite de l'email presente en base.
 */
export function createInMemoryParticipantRepository(seed = []) {
  let sequence = 0;
  const rows = new Map();

  const clone = (participant) => ({ ...participant });

  const emailTaken = (email, exceptId = null) =>
    [...rows.values()].some(
      (participant) => participant.email === email && participant.id !== exceptId
    );

  const insert = (data) => {
    if (emailTaken(data.email)) {
      throw conflict(`Un participant utilise deja l email ${data.email}`);
    }
    sequence += 1;
    const now = new Date().toISOString();
    const participant = {
      id: sequence,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      type: data.type,
      createdAt: now,
      updatedAt: now
    };
    rows.set(participant.id, participant);
    return clone(participant);
  };

  seed.forEach(insert);

  return {
    async create(data) {
      return insert(data);
    },

    async findAll(filters = {}) {
      let list = [...rows.values()];

      if (filters.type) {
        list = list.filter((participant) => participant.type === filters.type);
      }
      if (filters.email) {
        const needle = filters.email.toLowerCase();
        list = list.filter((participant) => participant.email.includes(needle));
      }
      if (filters.name) {
        const needle = filters.name.toLowerCase();
        list = list.filter((participant) =>
          participant.fullName.toLowerCase().includes(needle)
        );
      }
      if (filters.search) {
        const needle = filters.search.toLowerCase();
        list = list.filter(
          (participant) =>
            participant.fullName.toLowerCase().includes(needle) ||
            participant.email.includes(needle)
        );
      }

      return list.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(clone);
    },

    async findById(id) {
      const participant = rows.get(id);
      return participant ? clone(participant) : null;
    },

    async findByEmail(email) {
      const participant = [...rows.values()].find((item) => item.email === email);
      return participant ? clone(participant) : null;
    },

    async update(id, data) {
      const participant = rows.get(id);
      if (!participant) return null;
      if (data.email && emailTaken(data.email, id)) {
        throw conflict(`Un participant utilise deja l email ${data.email}`);
      }
      const updated = { ...participant, ...data, updatedAt: new Date().toISOString() };
      rows.set(id, updated);
      return clone(updated);
    },

    async remove(id) {
      return rows.delete(id);
    },

    async healthCheck() {
      return true;
    }
  };
}
