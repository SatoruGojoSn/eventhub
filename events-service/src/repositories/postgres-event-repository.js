const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  eventDate: row.event_date instanceof Date ? row.event_date.toISOString() : row.event_date,
  location: row.location,
  capacity: row.capacity,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
});

export function createPostgresEventRepository(pool) {
  return {
    async create(data) {
      const { rows } = await pool.query(
        `INSERT INTO events (title, description, event_date, location, capacity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.title, data.description, data.eventDate, data.location, data.capacity]
      );
      return mapRow(rows[0]);
    },

    async findAll(filters = {}) {
      const conditions = [];
      const values = [];

      if (filters.location) {
        values.push(`%${filters.location}%`);
        conditions.push(`location ILIKE $${values.length}`);
      }
      if (filters.date) {
        values.push(filters.date);
        conditions.push(`DATE(event_date) = DATE($${values.length})`);
      }
      if (filters.from) {
        values.push(filters.from);
        conditions.push(`event_date >= $${values.length}`);
      }
      if (filters.to) {
        values.push(filters.to);
        conditions.push(`event_date <= $${values.length}`);
      }
      if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(
          `(title ILIKE $${values.length} OR COALESCE(description, '') ILIKE $${values.length})`
        );
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM events ${where} ORDER BY event_date ASC`,
        values
      );
      return rows.map(mapRow);
    },

    async findById(id) {
      const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async update(id, data) {
      const fields = [];
      const values = [];

      const columns = {
        title: 'title',
        description: 'description',
        eventDate: 'event_date',
        location: 'location',
        capacity: 'capacity'
      };

      for (const [key, column] of Object.entries(columns)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          values.push(data[key]);
          fields.push(`${column} = $${values.length}`);
        }
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const { rows } = await pool.query(
        `UPDATE events SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM events WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async healthCheck() {
      await pool.query('SELECT 1');
      return true;
    }
  };
}
