import { useCallback, useEffect, useState } from 'react';
import { participantsApi, registrationsApi } from '../api/client.js';
import {
  Blank,
  Dialog,
  Field,
  Loading,
  Notice,
  PageHeader,
  Tag,
  formatDate
} from '../components/ui.jsx';

const TYPES = ['etudiant', 'professeur', 'externe'];
const TYPE_LABELS = {
  etudiant: 'Étudiant',
  professeur: 'Professeur',
  externe: 'Externe'
};

const EMPTY_FORM = { fullName: '', email: '', phone: '', type: 'etudiant' };

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await participantsApi.list(filters);
      setParticipants(response.data);
      setError(null);
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

  const openEdit = (participant) => {
    setEditing(participant.id);
    setForm({
      fullName: participant.fullName,
      email: participant.email,
      phone: participant.phone ?? '',
      type: participant.type
    });
  };

  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') {
        await participantsApi.create(form);
        setFeedback('Participant enregistré.');
      } else {
        await participantsApi.update(editing, form);
        setFeedback('Profil mis à jour.');
      }
      setEditing(null);
      await load();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (participant) => {
    if (!window.confirm(`Supprimer le participant « ${participant.fullName} » ?`)) return;
    try {
      await participantsApi.remove(participant.id);
      setFeedback('Participant supprimé.');
      await load();
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  // Consultation croisée : registrations-service renvoie les événements du participant.
  const showEvents = async (participant) => {
    try {
      const response = await registrationsApi.byParticipant(participant.id);
      setDetail({ participant, registrations: response.data });
    } catch (detailError) {
      setError(detailError.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Participants"
        subtitle="Comptes étudiants, professeurs et intervenants externes"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Nouveau participant
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
          placeholder="Rechercher par nom ou adresse électronique"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <select
          value={filters.type}
          onChange={(event) => setFilters({ ...filters, type: event.target.value })}
        >
          <option value="">Tous les profils</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={() => setFilters({ search: '', type: '' })}
        >
          Réinitialiser
        </button>
      </section>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : participants.length === 0 ? (
          <Blank title="Aucun participant" description="Ajoutez un premier profil." />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>Adresse électronique</th>
                  <th>Téléphone</th>
                  <th>Profil</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.fullName}</td>
                    <td className="mono">{participant.email}</td>
                    <td className="mono">{participant.phone || 'n.c.'}</td>
                    <td>
                      <Tag>{TYPE_LABELS[participant.type] ?? participant.type}</Tag>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => showEvents(participant)}
                        >
                          Inscriptions
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => openEdit(participant)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet btn-alert"
                          onClick={() => remove(participant)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Dialog
          title={editing === 'new' ? 'Nouveau participant' : 'Modifier le profil'}
          onClose={() => setEditing(null)}
        >
          <form className="form" onSubmit={submit}>
            <Field label="Nom complet">
              <input
                required
                maxLength={150}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </Field>

            <Field label="Adresse électronique">
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>

            <div className="field-pair">
              <Field label="Téléphone">
                <input
                  value={form.phone}
                  placeholder="+221 77 000 00 00"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </Field>

              <Field label="Profil">
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

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

      {detail && (
        <Dialog
          title={`Inscriptions de ${detail.participant.fullName}`}
          onClose={() => setDetail(null)}
        >
          {detail.registrations.length === 0 ? (
            <Blank title="Aucune inscription" />
          ) : (
            <ul className="stack">
              {detail.registrations.map((registration) => (
                <li key={registration.id}>
                  <div>
                    <div className="stack-title">
                      {registration.event?.title ?? `Événement n° ${registration.eventId}`}
                    </div>
                    <div className="stack-meta">
                      {formatDate(registration.event?.eventDate)}
                    </div>
                  </div>
                  <Tag tone={registration.status === 'CONFIRMED' ? 'on' : 'off'}>
                    {registration.status === 'CONFIRMED' ? 'Confirmée' : 'Annulée'}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </Dialog>
      )}
    </>
  );
}
