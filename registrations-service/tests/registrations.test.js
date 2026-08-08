import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createFakeEventsClient, startTestServer } from './helpers.js';

describe('registrations-service - sondes de sante', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('GET /health repond UP', async () => {
    const res = await client.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.service, 'registrations-service');
  });

  it('GET /ready repond READY', async () => {
    const res = await client.get('/ready');
    assert.equal(res.status, 200);
  });
});

describe('registrations-service - inscription', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('inscrit un participant a un evenement', async () => {
    const res = await client.post('/registrations', { eventId: 1, participantId: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'CONFIRMED');
    assert.equal(res.body.event.title, 'Conference IA & Afrique');
    assert.equal(res.body.participant.fullName, 'Awa Diop');
    assert.equal(res.body.remainingSeats, 2);
  });

  it('refuse une double inscription (409)', async () => {
    const res = await client.post('/registrations', { eventId: 1, participantId: 1 });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /deja inscrit/);
  });

  it('refuse un evenement inexistant (404)', async () => {
    const res = await client.post('/registrations', { eventId: 99, participantId: 1 });
    assert.equal(res.status, 404);
    assert.match(res.body.error, /Evenement 99 introuvable/);
  });

  it('refuse un participant inexistant (404)', async () => {
    const res = await client.post('/registrations', { eventId: 1, participantId: 99 });
    assert.equal(res.status, 404);
    assert.match(res.body.error, /Participant 99 introuvable/);
  });

  it('refuse un payload invalide (400)', async () => {
    const res = await client.post('/registrations', { eventId: 'abc' });
    assert.equal(res.status, 400);
    assert.equal(res.body.details.length, 2);
  });

  it('refuse l inscription quand l evenement est complet (409)', async () => {
    // capacite de l evenement 1 = 3 ; une place est deja prise.
    assert.equal((await client.post('/registrations', { eventId: 1, participantId: 2 })).status, 201);
    assert.equal((await client.post('/registrations', { eventId: 1, participantId: 3 })).status, 201);

    const full = await client.post('/registrations', { eventId: 1, participantId: 4 });
    assert.equal(full.status, 409);
    assert.match(full.body.error, /Evenement complet/);
  });
});

describe('registrations-service - annulation', () => {
  let client;

  before(async () => {
    client = await startTestServer({
      seed: [{ eventId: 1, participantId: 1 }]
    });
  });
  after(async () => client.close());

  it('annule une inscription existante', async () => {
    const res = await client.delete('/registrations/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.registration.status, 'CANCELLED');
    assert.ok(res.body.registration.cancelledAt);
  });

  it('refuse une double annulation (409)', async () => {
    const res = await client.delete('/registrations/1');
    assert.equal(res.status, 409);
  });

  it('renvoie 404 pour une inscription inexistante', async () => {
    const res = await client.delete('/registrations/999');
    assert.equal(res.status, 404);
  });

  it('libere une place apres annulation', async () => {
    const availability = await client.get('/registrations/availability/1');
    assert.equal(availability.body.registered, 0);
    assert.equal(availability.body.remaining, 3);
    assert.equal(availability.body.available, true);
  });

  it('autorise une reinscription apres annulation', async () => {
    const res = await client.post('/registrations', { eventId: 1, participantId: 1 });
    assert.equal(res.status, 201);
  });
});

describe('registrations-service - consultation croisee', () => {
  let client;

  before(async () => {
    client = await startTestServer({
      seed: [
        { eventId: 1, participantId: 1 },
        { eventId: 1, participantId: 2 },
        { eventId: 2, participantId: 1 },
        { eventId: 2, participantId: 3, status: 'CANCELLED' }
      ]
    });
  });
  after(async () => client.close());

  it('liste les inscriptions d un evenement avec le profil des participants', async () => {
    const res = await client.get('/events/1/registrations');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
    assert.equal(res.body.event.title, 'Conference IA & Afrique');
    assert.deepEqual(
      res.body.data.map((registration) => registration.participant.fullName).sort(),
      ['Awa Diop', 'Moussa Ndiaye']
    );
  });

  it('liste les evenements d un participant', async () => {
    const res = await client.get('/participants/1/events');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
    assert.deepEqual(
      res.body.data.map((registration) => registration.event.title).sort(),
      ['Atelier Docker', 'Conference IA & Afrique']
    );
  });

  it('filtre par statut', async () => {
    const res = await client.get('/events/2/registrations?status=CANCELLED');
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].participantId, 3);
  });

  it('refuse un statut inconnu (400)', async () => {
    const res = await client.get('/registrations?status=INCONNU');
    assert.equal(res.status, 400);
  });

  it('renvoie 404 pour les inscriptions d un evenement inexistant', async () => {
    const res = await client.get('/events/99/registrations');
    assert.equal(res.status, 404);
  });

  it('expose les memes donnees via les alias /registrations/by-*', async () => {
    const byEvent = await client.get('/registrations/by-event/1');
    assert.equal(byEvent.status, 200);
    assert.equal(byEvent.body.count, 2);

    const byParticipant = await client.get('/registrations/by-participant/1');
    assert.equal(byParticipant.status, 200);
    assert.equal(byParticipant.body.count, 2);
  });
});

describe('registrations-service - statistiques', () => {
  let client;

  before(async () => {
    client = await startTestServer({
      seed: [
        { eventId: 1, participantId: 1 },
        { eventId: 1, participantId: 2 },
        { eventId: 2, participantId: 1 },
        { eventId: 2, participantId: 3, status: 'CANCELLED' }
      ]
    });
  });
  after(async () => client.close());

  it('renvoie les statistiques globales', async () => {
    const res = await client.get('/registrations/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 4);
    assert.equal(res.body.confirmed, 3);
    assert.equal(res.body.cancelled, 1);
    assert.equal(res.body.distinctEvents, 2);
    assert.equal(res.body.byEvent.length, 2);
  });

  it('enrichit les statistiques avec le titre et le taux de remplissage', async () => {
    const res = await client.get('/registrations/stats');
    const event1 = res.body.byEvent.find((entry) => entry.eventId === 1);
    assert.equal(event1.title, 'Conference IA & Afrique');
    assert.equal(event1.capacity, 3);
    assert.equal(event1.confirmed, 2);
    assert.equal(event1.fillRate, 66.7);
  });

  it('renvoie le compteur d un evenement (endpoint consomme par events-service)', async () => {
    const res = await client.get('/registrations/stats/events/2');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { eventId: 2, total: 2, confirmed: 1, cancelled: 1 });
  });

  it('calcule la disponibilite d un evenement', async () => {
    const res = await client.get('/registrations/availability/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.capacity, 3);
    assert.equal(res.body.registered, 2);
    assert.equal(res.body.remaining, 1);
    assert.equal(res.body.available, true);
  });
});

describe('registrations-service - resilience inter-services', () => {
  it('renvoie 503 quand events-service est injoignable', async () => {
    const client = await startTestServer({
      eventsClient: {
        async getEvent() {
          const error = new Error('events-service injoignable : fetch failed');
          error.status = 503;
          throw error;
        }
      }
    });

    const res = await client.post('/registrations', { eventId: 1, participantId: 1 });
    assert.equal(res.status, 503);

    await client.close();
  });

  it('renvoie l inscription sans profil si participants-service est indisponible', async () => {
    const client = await startTestServer({
      seed: [{ eventId: 1, participantId: 1 }],
      eventsClient: createFakeEventsClient(),
      participantsClient: {
        async getParticipant() {
          const error = new Error('participants-service injoignable');
          error.status = 503;
          throw error;
        }
      }
    });

    const res = await client.get('/events/1/registrations');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].participant, null);

    await client.close();
  });
});
