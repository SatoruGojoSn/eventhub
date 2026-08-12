import { useCallback, useEffect, useState } from 'react';
import { eventsApi, healthApi, participantsApi, registrationsApi } from '../api/client.js';
import {
  Blank,
  Figure,
  Loading,
  Meter,
  Notice,
  PageHeader,
  Tag,
  formatDate
} from '../components/ui.jsx';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Le tableau de bord consolide les données des trois microservices.
      const [eventsResponse, participantsResponse, statsResponse, healthResponse] =
        await Promise.all([
          eventsApi.list(),
          participantsApi.list(),
          registrationsApi.stats(),
          healthApi.statuses()
        ]);

      setEvents(eventsResponse.data);
      setParticipants(participantsResponse.data);
      setStats(statsResponse);
      setHealth(healthResponse);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Consolidation des données des trois services…" />;

  const upcoming = events
    .filter((event) => new Date(event.eventDate) >= new Date())
    .slice(0, 4);

  const totalCapacity = events.reduce((sum, event) => sum + event.capacity, 0);
  const confirmed = stats?.confirmed ?? 0;
  const fillRate = totalCapacity > 0 ? Math.round((confirmed / totalCapacity) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue consolidée des événements, des participants et des inscriptions"
        action={
          <button type="button" className="btn" onClick={load}>
            Actualiser
          </button>
        }
      />

      <Notice tone="error" onClose={() => setError(null)}>
        {error}
      </Notice>

      <section className="figures">
        <Figure label="Événements" value={events.length} note="events-service" />
        <Figure label="Participants" value={participants.length} note="participants-service" />
        <Figure
          label="Inscriptions confirmées"
          value={confirmed}
          note={`${stats?.cancelled ?? 0} annulation(s)`}
        />
        <Figure
          label="Taux de remplissage"
          value={`${fillRate} %`}
          note={`${confirmed} places sur ${totalCapacity}`}
        />
      </section>

      <div className="columns">
        <section className="panel">
          <div className="panel-head">
            <h2>Remplissage par événement</h2>
          </div>

          {(stats?.byEvent ?? []).length === 0 ? (
            <Blank
              title="Aucune inscription enregistrée"
              description="Les statistiques apparaîtront dès la première inscription."
            />
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Événement</th>
                    <th className="right">Confirmées</th>
                    <th className="right">Annulées</th>
                    <th>Remplissage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byEvent.map((entry) => (
                    <tr key={entry.eventId}>
                      <td>{entry.title ?? `Événement n° ${entry.eventId}`}</td>
                      <td className="right mono">{entry.confirmed}</td>
                      <td className="right mono">{entry.cancelled}</td>
                      <td>
                        <div className="cell-meter">
                          <Meter value={entry.confirmed} max={entry.capacity ?? 0} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div>
          <section className="panel">
            <div className="panel-head">
              <h2>État des services</h2>
            </div>
            <div className="panel-body">
              <ul className="stack">
                {health.map((service) => (
                  <li key={service.service}>
                    <span className="service-line">{service.service}-service</span>
                    <Tag tone={service.status === 'UP' ? 'on' : 'off'}>{service.status}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Prochains événements</h2>
            </div>
            <div className="panel-body">
              {upcoming.length === 0 ? (
                <Blank title="Aucun événement à venir" />
              ) : (
                <ul className="stack">
                  {upcoming.map((event) => (
                    <li key={event.id}>
                      <div>
                        <div className="stack-title">{event.title}</div>
                        <div className="stack-meta">{formatDate(event.eventDate)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
