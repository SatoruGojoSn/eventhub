/**
 * Implementation en memoire du depot d'evenements.
 * Utilisee par les tests unitaires : elle permet d'executer la suite de tests
 * sans avoir besoin d'une base PostgreSQL.
 */
export function createInMemoryEventRepository(seed = []) {
  let sequence = 0;
  const rows = new Map();

  const clone = (event) => ({ ...event });

  const insert = (data) => {
    sequence += 1;
    const now = new Date().toISOString();
    const event = {
      id: sequence,
      title: data.title,
      description: data.description ?? null,
      eventDate: data.eventDate,
      location: data.location,
      capacity: data.capacity,
      createdAt: now,
      updatedAt: now
    };
    rows.set(event.id, event);
    return clone(event);
  };

  seed.forEach(insert);

  return {
    async create(data) {
      return insert(data);
    },

    async findAll(filters = {}) {
      let list = [...rows.values()];

      if (filters.location) {
        const needle = filters.location.toLowerCase();
        list = list.filter((event) => event.location.toLowerCase().includes(needle));
      }

      if (filters.date) {
        const day = filters.date.slice(0, 10);
        list = list.filter((event) => event.eventDate.slice(0, 10) === day);
      }

      if (filters.from) {
        list = list.filter((event) => event.eventDate >= filters.from);
      }

      if (filters.to) {
        list = list.filter((event) => event.eventDate <= filters.to);
      }

      if (filters.search) {
        const needle = filters.search.toLowerCase();
        list = list.filter(
          (event) =>
            event.title.toLowerCase().includes(needle) ||
            (event.description ?? '').toLowerCase().includes(needle)
        );
      }

      return list
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .map(clone);
    },

    async findById(id) {
      const event = rows.get(id);
      return event ? clone(event) : null;
    },

    async update(id, data) {
      const event = rows.get(id);
      if (!event) return null;
      const updated = { ...event, ...data, updatedAt: new Date().toISOString() };
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
