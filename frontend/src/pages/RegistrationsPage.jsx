import { useCallback, useEffect, useState } from 'react';
import { eventsApi, participantsApi, registrationsApi } from '../api/client.js';
import {
  Blank,
  Field,
  Loading,
  Meter,
  Notice,
  PageHeader,
  Tag,
  formatDate
} from '../components/ui.jsx';

const TYPE_LABELS = {
  etudiant: 'Étudiant',
  professeur: 'Professeur',
  externe: 'Externe'
};

export default function RegistrationsPage() {
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [availability, setAvailability] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [eventsResponse, participantsResponse] = await Promise.all([
          eventsApi.list(),
          participantsApi.list()
        ]);
        setEvents(eventsResponse.data);
        setParticipants(participantsResponse.data);
        if (eventsResponse.data.length > 0) {
          setSelectedEvent(String(eventsResponse.data[0].id));
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Disponibilité et liste des inscrits rechargées à chaque changement
  // d'événement : c'est la détection de places avant inscription.
  const refreshEvent = useCallback(async (eventId) => {
    if (!eventId) {
      setAvailability(null);
      setRegistrations([]);
      return;
    }
    try {
      const [availabilityResponse, registrationsResponse] = await Promise.all([
        registrationsApi.availability(eventId),
        registrationsApi.byEvent(eventId)
      ]);
      setAvailability(availabilityResponse);
      setRegistrations(registrationsResponse.data);
      setError(null);
    } catch (refreshError) {
      setError(refreshError.message);
    }
  }, []);

  useEffect(() => {
    refreshEvent(selectedEvent);
  }, [selectedEvent, refreshEvent]);

  const register = async (submitEvent) => {
    submitEvent.preventDefault();
    setSubmitting(true);
    try {
      const result = await registrationsApi.register(selectedEvent, selectedParticipant);
      setFeedback(
        `${result.participant.fullName} est inscrit(e) à « ${result.event.title} ». ` +
          `Places restantes : ${result.remainingSeats}.`
      );
      setSelectedParticipant('');
      await refreshEvent(selectedEvent);
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (registration) => {
    if (!window.confirm('Annuler cette inscription ?')) return;
    try {
      await registrationsApi.cancel(registration.id);
      setFeedback('Inscription annulée, une place est libérée.');
      await refreshEvent(selectedEvent);
    } catch (cancelError) {
      setError(cancelError.message);
    }
  };

  if (loading) return <Loading />;

  const confirmed = registrations.filter((item) => item.status === 'CONFIRMED');
  const cancelled = registrations.filter((item) => item.status === 'CANCELLED');
  const full = availability?.available === false;

  return (
    <>
      <PageHeader
        title="Inscriptions"
        subtitle="Inscription des participants et suivi des places disponibles"
      />

      <Notice tone="error" onClose={() => setError(null)}>
        {error}
      </Notice>
      <Notice tone="ok" onClose={() => setFeedback(null)}>
        {feedback}
      </Notice>

      {events.length === 0 || participants.length === 0 ? (
        <div className="panel">
          <Blank
            title="Données insuffisantes"
            description="Créez au moins un événement et un participant avant de procéder à une inscription."
          />
        </div>
      ) : (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Nouvelle inscription</h2>
              {availability && (
                <span className="meter-value">
                  {availability.registered} inscrit(s) sur {availability.capacity},{' '}
                  {availability.remaining} restante(s)
                </span>
              )}
            </div>

            <div className="panel-body">
              <form className="form form-inline" onSubmit={register}>
                <Field label="Événement">
                  <select
                    value={selectedEvent}
                    onChange={(event) => setSelectedEvent(event.target.value)}
                  >
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Participant">
                  <select
                    required
                    value={selectedParticipant}
                    onChange={(event) => setSelectedParticipant(event.target.value)}
                  >
                    <option value="">Sélectionner un participant</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.fullName} ({participant.email})
                      </option>
                    ))}
                  </select>
                </Field>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || full}
                >
                  {full ? 'Événement complet' : submitting ? 'Inscription…' : 'Inscrire'}
                </button>
              </form>

              {availability && (
                <div className="cell-meter" style={{ marginTop: '1rem', maxWidth: '420px' }}>
                  <Meter value={availability.registered} max={availability.capacity} />
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Inscrits ({confirmed.length})</h2>
              {cancelled.length > 0 && (
                <span className="muted">{cancelled.length} annulation(s)</span>
              )}
            </div>

            {registrations.length === 0 ? (
              <Blank title="Aucune inscription pour cet événement" />
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Adresse électronique</th>
                      <th>Profil</th>
                      <th>Inscrit le</th>
                      <th>Statut</th>
                      <th className="right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((registration) => (
                      <tr key={registration.id}>
                        <td>
                          {registration.participant?.fullName ??
                            `Participant n° ${registration.participantId}`}
                        </td>
                        <td className="mono">{registration.participant?.email ?? 'n.c.'}</td>
                        <td>
                          {TYPE_LABELS[registration.participant?.type] ?? 'n.c.'}
                        </td>
                        <td className="mono">{formatDate(registration.registeredAt)}</td>
                        <td>
                          <Tag tone={registration.status === 'CONFIRMED' ? 'on' : 'off'}>
                            {registration.status === 'CONFIRMED' ? 'Confirmée' : 'Annulée'}
                          </Tag>
                        </td>
                        <td>
                          <div className="row-actions">
                            {registration.status === 'CONFIRMED' && (
                              <button
                                type="button"
                                className="btn btn-quiet btn-alert"
                                onClick={() => cancel(registration)}
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
