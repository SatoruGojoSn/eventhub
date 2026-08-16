import { REGISTRATION_STATUS } from '../config.js';
import { conflict } from '../errors.js';

const UNIQUE_VIOLATION = '23505';

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);

const mapRow = (row) => ({
  id: row.id,
  eventId: row.event_id,
  participantId: row.participant_id,
  status: row.status,
  registeredAt: toIso(row.registered_at),
  cancelledAt: toIso(row.cancelled_at)
});

export function createPostgresRegistrationRepository(pool) {
  return {
    async create({ eventId, participantId }) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO registrations (event_id, participant_id, status)
           VALUES ($1, $2, 'CONFIRMED')
           RETURNING *`,
          [eventId, participantId]
        );
        return mapRow(rows[0]);
      } catch (error) {
        // L'index unique partiel garantit l'absence de double inscription meme
        // en cas de requetes concurrentes.
        if (error.code === UNIQUE_VIOLATION) {
          throw conflict(
            `Le participant ${participantId} est deja inscrit a l evenement ${eventId}`
          );
        }
        throw error;
      }
    },

    async findAll(filters = {}) {
      const conditions = [];
      const values = [];

      if (filters.eventId) {
        values.push(filters.eventId);
        conditions.push(`event_id = $${values.length}`);
      }
      if (filters.participantId) {
        values.push(filters.participantId);
        conditions.push(`participant_id = $${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        conditions.push(`status = $${values.length}`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM registrations ${where} ORDER BY id DESC`,
        values
      );
      return rows.map(mapRow);
    },

    async findById(id) {
      const { rows } = await pool.query('SELECT * FROM registrations WHERE id = $1', [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async findConfirmed(eventId, participantId) {
      const { rows } = await pool.query(
        `SELECT * FROM registrations
         WHERE event_id = $1 AND participant_id = $2 AND status = 'CONFIRMED'`,
        [eventId, participantId]
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async cancel(id) {
      const { rows } = await pool.query(
        `UPDATE registrations
         SET status = 'CANCELLED', cancelled_at = NOW()
         WHERE id = $1 AND status = 'CONFIRMED'
         RETURNING *`,
        [id]
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async countConfirmedByEvent(eventId) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM registrations
         WHERE event_id = $1 AND status = 'CONFIRMED'`,
        [eventId]
      );
      return rows[0].count;
    },

    async statsByEvent(eventId) {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*)::int                                                        AS total,
           COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int                    AS confirmed,
           COUNT(*) FILTER (WHERE status = 'CANCELLED')::int                    AS cancelled
         FROM registrations
         WHERE event_id = $1`,
        [eventId]
      );
      return { eventId, ...rows[0] };
    },

    async globalStats() {
      const totals = await pool.query(
        `SELECT
           COUNT(*)::int                                     AS total,
           COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int  AS confirmed,
           COUNT(*) FILTER (WHERE status = 'CANCELLED')::int  AS cancelled,
           COUNT(DISTINCT event_id)::int                      AS "distinctEvents",
           COUNT(DISTINCT participant_id)::int                AS "distinctParticipants"
         FROM registrations`
      );

      const byEvent = await pool.query(
        `SELECT
           event_id                                          AS "eventId",
           COUNT(*)::int                                     AS total,
           COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int  AS confirmed,
           COUNT(*) FILTER (WHERE status = 'CANCELLED')::int  AS cancelled
         FROM registrations
         GROUP BY event_id
         ORDER BY confirmed DESC`
      );

      return { ...totals.rows[0], byEvent: byEvent.rows };
    },

    async healthCheck() {
      await pool.query('SELECT 1');
      return true;
    }
  };
}

export { REGISTRATION_STATUS };
