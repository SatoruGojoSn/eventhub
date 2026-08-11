import { conflict } from '../errors.js';

const UNIQUE_VIOLATION = '23505';

const mapRow = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  type: row.type,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
});

export function createPostgresParticipantRepository(pool) {
  return {
    async create(data) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO participants (full_name, email, phone, type)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [data.fullName, data.email, data.phone, data.type]
        );
        return mapRow(rows[0]);
      } catch (error) {
        if (error.code === UNIQUE_VIOLATION) {
          throw conflict(`Un participant utilise deja l email ${data.email}`);
        }
        throw error;
      }
    },

    async findAll(filters = {}) {
      const conditions = [];
      const values = [];

      if (filters.type) {
        values.push(filters.type);
        conditions.push(`type = $${values.length}`);
      }
      if (filters.email) {
        values.push(`%${filters.email}%`);
        conditions.push(`email ILIKE $${values.length}`);
      }
      if (filters.name) {
        values.push(`%${filters.name}%`);
        conditions.push(`full_name ILIKE $${values.length}`);
      }
      if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(
          `(full_name ILIKE $${values.length} OR email ILIKE $${values.length})`
        );
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM participants ${where} ORDER BY full_name ASC`,
        values
      );
      return rows.map(mapRow);
    },

    async findById(id) {
      const { rows } = await pool.query('SELECT * FROM participants WHERE id = $1', [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async findByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM participants WHERE email = $1', [
        email
      ]);
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async update(id, data) {
      const columns = {
        fullName: 'full_name',
        email: 'email',
        phone: 'phone',
        type: 'type'
      };

      const fields = [];
      const values = [];

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

      try {
        const { rows } = await pool.query(
          `UPDATE participants SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
          values
        );
        return rows[0] ? mapRow(rows[0]) : null;
      } catch (error) {
        if (error.code === UNIQUE_VIOLATION) {
          throw conflict(`Un participant utilise deja l email ${data.email}`);
        }
        throw error;
      }
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM participants WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async healthCheck() {
      await pool.query('SELECT 1');
      return true;
    }
  };
}
