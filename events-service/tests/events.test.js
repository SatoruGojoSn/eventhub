import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { sampleEvent, startTestServer } from './helpers.js';

describe('events-service - sondes de sante', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('GET /health repond UP', async () => {
    const res = await client.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(res.body.service, 'events-service');
  });

  it('GET /ready repond READY quand le depot est joignable', async () => {
    const res = await client.get('/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'READY');
  });
});

describe('events-service - creation d evenements', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('cree un evenement valide et renvoie 201', async () => {
    const res = await client.post('/events', sampleEvent);
    assert.equal(res.status, 201);
    assert.equal(res.body.title, sampleEvent.title);
    assert.equal(res.body.capacity, 120);
    assert.ok(res.body.id > 0);
    assert.ok(res.body.createdAt);
  });

  it('refuse un evenement sans titre', async () => {
    const res = await client.post('/events', { ...sampleEvent, title: '   ' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.includes('title est obligatoire'));
  });

  it('refuse une capacite nulle ou negative', async () => {
    const res = await client.post('/events', { ...sampleEvent, capacity: 0 });
    assert.equal(res.status, 400);
    assert.ok(
      res.body.details.includes('capacity doit etre un entier strictement positif')
    );
  });

  it('refuse une date invalide', async () => {
    const res = await client.post('/events', { ...sampleEvent, eventDate: 'pas-une-date' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.includes('eventDate doit etre une date ISO valide'));
  });
});

describe('events-service - lecture et filtres', () => {
  let client;

  before(async () => {
    client = await startTestServer({
      seed: [
        sampleEvent,
        {
          title: 'Atelier Docker',
          description: 'Atelier pratique conteneurisation',
          eventDate: '2026-09-20T14:00:00.000Z',
          location: 'Salle B - DIT Dakar',
          capacity: 30
        },
        {
          title: 'Seminaire DevOps',
          description: 'CI/CD et automatisation',
          eventDate: '2026-10-01T10:00:00.000Z',
          location: 'Amphitheatre A - DIT Dakar',
          capacity: 80
        }
      ]
    });
  });
  after(async () => client.close());

  it('liste tous les evenements tries par date', async () => {
    const res = await client.get('/events');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 3);
    assert.deepEqual(
      res.body.data.map((event) => event.title),
      ['Conference IA & Afrique', 'Atelier Docker', 'Seminaire DevOps']
    );
  });

  it('filtre par lieu', async () => {
    const res = await client.get('/events?location=Salle%20B');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].title, 'Atelier Docker');
  });

  it('filtre par date', async () => {
    const res = await client.get('/events?date=2026-10-01');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].title, 'Seminaire DevOps');
  });

  it('recherche plein texte sur titre et description', async () => {
    const res = await client.get('/events?search=CI/CD');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].title, 'Seminaire DevOps');
  });

  it('renvoie le detail d un evenement', async () => {
    const res = await client.get('/events/2');
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Atelier Docker');
  });

  it('renvoie 404 pour un evenement inexistant', async () => {
    const res = await client.get('/events/999');
    assert.equal(res.status, 404);
  });

  it('renvoie 400 pour un identifiant non numerique', async () => {
    const res = await client.get('/events/abc');
    assert.equal(res.status, 400);
  });
});

describe('events-service - mise a jour et suppression', () => {
  let client;

  before(async () => {
    client = await startTestServer({ seed: [sampleEvent] });
  });
  after(async () => client.close());

  it('met a jour partiellement un evenement', async () => {
    const res = await client.put('/events/1', { capacity: 200 });
    assert.equal(res.status, 200);
    assert.equal(res.body.capacity, 200);
    assert.equal(res.body.title, sampleEvent.title);
  });

  it('refuse une mise a jour vide', async () => {
    const res = await client.put('/events/1', {});
    assert.equal(res.status, 400);
  });

  it('renvoie 404 lors de la mise a jour d un evenement inexistant', async () => {
    const res = await client.put('/events/404', { capacity: 10 });
    assert.equal(res.status, 404);
  });

  it('supprime un evenement puis renvoie 404', async () => {
    const deleted = await client.delete('/events/1');
    assert.equal(deleted.status, 204);

    const after404 = await client.get('/events/1');
    assert.equal(after404.status, 404);
  });
});

describe('events-service - disponibilite (appel a registrations-service)', () => {
  it('calcule les places restantes a partir des inscriptions confirmees', async () => {
    const client = await startTestServer({
      seed: [{ ...sampleEvent, capacity: 10 }],
      registrationsClient: {
        async countConfirmedForEvent(eventId) {
          assert.equal(eventId, 1);
          return 4;
        }
      }
    });

    const res = await client.get('/events/1/availability');
    assert.equal(res.status, 200);
    assert.deepEqual(
      { capacity: res.body.capacity, registered: res.body.registered, remaining: res.body.remaining, available: res.body.available },
      { capacity: 10, registered: 4, remaining: 6, available: true }
    );

    await client.close();
  });

  it('signale un evenement complet', async () => {
    const client = await startTestServer({
      seed: [{ ...sampleEvent, capacity: 5 }],
      registrationsClient: {
        async countConfirmedForEvent() {
          return 5;
        }
      }
    });

    const res = await client.get('/events/1/availability');
    assert.equal(res.body.remaining, 0);
    assert.equal(res.body.available, false);

    await client.close();
  });

  it('renvoie 503 si registrations-service est injoignable', async () => {
    const client = await startTestServer({
      seed: [sampleEvent],
      registrationsClient: {
        async countConfirmedForEvent() {
          const error = new Error('registrations-service injoignable');
          error.status = 503;
          throw error;
        }
      }
    });

    const res = await client.get('/events/1/availability');
    assert.equal(res.status, 503);

    await client.close();
  });
});
