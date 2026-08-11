import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { sampleParticipants, startTestServer } from './helpers.js';

describe('participants-service - sondes de sante', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('GET /health repond UP', async () => {
    const res = await client.get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.service, 'participants-service');
  });

  it('GET /ready repond READY', async () => {
    const res = await client.get('/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'READY');
  });
});

describe('participants-service - creation', () => {
  let client;

  before(async () => {
    client = await startTestServer();
  });
  after(async () => client.close());

  it('cree un participant valide', async () => {
    const res = await client.post('/participants', sampleParticipants[0]);
    assert.equal(res.status, 201);
    assert.equal(res.body.fullName, 'Awa Diop');
    assert.equal(res.body.type, 'etudiant');
    assert.ok(res.body.id > 0);
  });

  it('normalise l email en minuscules', async () => {
    const res = await client.post('/participants', {
      fullName: 'Ibrahima Fall',
      email: '  Ibrahima.FALL@DIT.SN ',
      phone: '778889900',
      type: 'etudiant'
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.email, 'ibrahima.fall@dit.sn');
  });

  it('refuse un email invalide', async () => {
    const res = await client.post('/participants', {
      ...sampleParticipants[1],
      email: 'pas-un-email'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.includes('email doit avoir un format valide'));
  });

  it('refuse un type inconnu', async () => {
    const res = await client.post('/participants', {
      fullName: 'Test Type',
      email: 'test.type@dit.sn',
      type: 'stagiaire'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some((detail) => detail.startsWith('type doit valoir')));
  });

  it('refuse un email deja utilise (409)', async () => {
    const res = await client.post('/participants', {
      fullName: 'Homonyme',
      email: 'awa.diop@dit.sn',
      type: 'externe'
    });
    assert.equal(res.status, 409);
  });
});

describe('participants-service - lecture et recherche', () => {
  let client;

  before(async () => {
    client = await startTestServer({ seed: sampleParticipants });
  });
  after(async () => client.close());

  it('liste les participants tries par nom', async () => {
    const res = await client.get('/participants');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 3);
    assert.deepEqual(
      res.body.data.map((participant) => participant.fullName),
      ['Awa Diop', 'Fatou Sall', 'Moussa Ndiaye']
    );
  });

  it('filtre par type', async () => {
    const res = await client.get('/participants?type=professeur');
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].fullName, 'Moussa Ndiaye');
  });

  it('recherche par nom via /participants/search', async () => {
    const res = await client.get('/participants/search?name=sall');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].email, 'fatou.sall@externe.com');
  });

  it('recherche par email exact via /participants/search', async () => {
    const res = await client.get('/participants/search?email=moussa.ndiaye@dit.sn');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].fullName, 'Moussa Ndiaye');
  });

  it('exige au moins un critere de recherche', async () => {
    const res = await client.get('/participants/search');
    assert.equal(res.status, 400);
  });

  it('renvoie 404 pour un participant inexistant', async () => {
    const res = await client.get('/participants/999');
    assert.equal(res.status, 404);
  });
});

describe('participants-service - modification et suppression', () => {
  let client;

  before(async () => {
    client = await startTestServer({ seed: sampleParticipants });
  });
  after(async () => client.close());

  it('modifie le profil d un participant', async () => {
    const res = await client.put('/participants/1', { phone: '+221 70 000 00 00' });
    assert.equal(res.status, 200);
    assert.equal(res.body.phone, '+221 70 000 00 00');
    assert.equal(res.body.fullName, 'Awa Diop');
  });

  it('refuse de reutiliser l email d un autre participant', async () => {
    const res = await client.put('/participants/1', { email: 'moussa.ndiaye@dit.sn' });
    assert.equal(res.status, 409);
  });

  it('supprime un participant', async () => {
    const deleted = await client.delete('/participants/3');
    assert.equal(deleted.status, 204);

    const res = await client.get('/participants/3');
    assert.equal(res.status, 404);
  });

  it('renvoie 404 lors de la suppression d un participant inexistant', async () => {
    const res = await client.delete('/participants/999');
    assert.equal(res.status, 404);
  });
});
