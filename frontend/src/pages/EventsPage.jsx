import { useCallback, useEffect, useState } from 'react';
import { eventsApi, registrationsApi } from '../api/client.js';
import {
  Blank,
  Dialog,
  Field,
  Loading,
  Meter,
  Notice,
  PageHeader,
  formatDate,
  toInputDateTime
} from '../components/ui.jsx';

const EMPTY_FORM = {
  title: '',
  description: '',
  eventDate: '',
  location: '',
  capacity: 50
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState({});
  const [filters, setFilters] = useState({ search: '', location: '', date: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await eventsApi.list(filters);
      setEvents(response.data);
      setError(null);

      // Les places restantes viennent de registrations-service.
      const entries = await Promise.all(
        response.data.map(async (event) => {
          try {
            return [event.id, await registrationsApi.availability(event.id)];
          } catch {
            return [event.id, null];
          }
        })
      );
      setAvailability(Object.fromEntries(entries));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing('new');
    setForm(EMPTY_FORM);
  };

  const openEdit = (event) => {
    setEditing(event.id);
    setForm({
      title: event.title,
      description: event.description ?? '',
      eventDate: toInputDateTime(event.eventDate),
      location: event.location,
      capacity: event.capacity
    });
  };

  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        eventDate: new Date(form.eventDate).toISOString()
      };

      if (editing === 'new') {
        await eventsApi.create(payload);
        setFeedback('Événement créé.');
      } else {
        await eventsApi.update(editing, payload);
        setFeedback('Événement mis à jour.');
      }

      setEditing(null);
      await load();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event) => {
    if (!window.confirm(`Supprimer définitivement « ${event.title} » ?`)) return;
    try {
      await eventsApi.remove(event.id);
      setFeedback('Événement supprimé.');
      await load();
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle="Création, modification et suivi de la capacité"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Nouvel événement
          </button>
        }
      />

      <Notice tone="error" onClose={() => setError(null)}>
        {error}
      </Notice>
      <Notice tone="ok" onClose={() => setFeedback(null)}>
        {feedback}
      </Notice>

      <section className="filters">
        <input
          type="search"
          placeholder="Rechercher un titre ou une description"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <input
          type="text"
          placeholder="Filtrer par lieu"
          value={filters.location}
          onChange={(event) => setFilters({ ...filters, location: event.target.value })}
        />
        <input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters({ ...filters, date: event.target.value })}
        />
        <button
          type="button"
          className="btn"
          onClick={() => setFilters({ search: '', location: '', date: '' })}
        >
          Réinitialiser
        </button>
      </section>

      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <div className="panel">
          <Blank
            title="Aucun événement"
            description="Créez le premier événement de la plateforme."
          />
        </div>
      ) : (
        <ul className="event-list">
          {events.map((event) => {
            const seats = availability[event.id];
            const full = seats?.available === false;

            return (
              <li key={event.id}>
                <article className="event-row">
                  <div>
                    <h3 className="event-title">{event.title}</h3>
                    <p className="event-desc">
                      {event.description || 'Aucune description'}
                    </p>
                  </div>

                  <div>
                    <div className="event-when">{formatDate(event.eventDate)}</div>
                    <div className="event-where">{event.location}</div>
                  </div>

                  <div>
                    <div className={`seats${full ? ' none' : ''}`}>
                      {seats
                        ? full
                          ? 'Complet'
                          : `${seats.remaining} place(s) restantes`
                        : `${event.capacity} places`}
                    </div>
                    {seats && (
                      <div className="cell-meter" style={{ marginTop: '0.45rem' }}>
                        <Meter value={seats.registered} max={seats.capacity} showValue={false} />
                        <span className="meter-value">
                          {seats.registered}/{seats.capacity}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="row-actions">
                    <button type="button" className="btn btn-quiet" onClick={() => openEdit(event)}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-alert"
                      onClick={() => remove(event)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Dialog
          title={editing === 'new' ? 'Nouvel événement' : "Modifier l'événement"}
          onClose={() => setEditing(null)}
        >
          <form className="form" onSubmit={submit}>
            <Field label="Titre">
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>

            <div className="field-pair">
              <Field label="Date et heure">
                <input
                  required
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
                />
              </Field>

              <Field label="Capacité maximale">
                <input
                  required
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Lieu">
              <input
                required
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </Field>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
