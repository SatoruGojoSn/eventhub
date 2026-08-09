#!/usr/bin/env node
/**
 * Jeu de donnees de demonstration EventHub.
 *
 * Le script passe uniquement par les API REST publiques : il fonctionne donc
 * aussi bien sur une stack docker-compose que sur des services lances a la main.
 *
 *   node scripts/seed-demo.mjs
 *   EVENTS_URL=http://localhost:3001 node scripts/seed-demo.mjs
 */

const EVENTS_URL = process.env.EVENTS_URL ?? 'http://localhost:3001';
const PARTICIPANTS_URL = process.env.PARTICIPANTS_URL ?? 'http://localhost:3002';
const REGISTRATIONS_URL = process.env.REGISTRATIONS_URL ?? 'http://localhost:3003';

const post = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${response.status} ${url} :: ${payload?.error ?? 'erreur inconnue'}`);
  }
  return payload;
};

const EVENTS = [
  {
    title: 'Conférence IA & Afrique 2026',
    description:
      "Conférence annuelle du DIT sur les applications de l'intelligence artificielle en Afrique de l'Ouest.",
    eventDate: '2026-09-15T09:00:00.000Z',
    location: 'Amphithéâtre A, DIT Dakar',
    capacity: 120
  },
  {
    title: 'Atelier Docker et conteneurisation',
    description: 'Atelier pratique : images, volumes, réseaux et docker-compose.',
    eventDate: '2026-09-20T14:00:00.000Z',
    // Petite capacité volontaire : l'atelier sert à illustrer le contrôle
    // des places et l'état « complet » dans l'interface.
    location: 'Salle B, DIT Dakar',
    capacity: 6
  },
  {
    title: 'Séminaire DevOps : CI/CD avec GitHub Actions',
    description: 'Automatisation des tests, du build et du déploiement continu.',
    eventDate: '2026-10-01T10:00:00.000Z',
    location: 'Laboratoire informatique, DIT Dakar',
    capacity: 40
  },
  {
    title: 'Journée portes ouvertes du DIT',
    description: 'Présentation des filières et des projets étudiants.',
    eventDate: '2026-10-12T08:30:00.000Z',
    location: 'Campus DIT, Dakar',
    capacity: 300
  }
];

const PARTICIPANTS = [
  { fullName: 'Awa Diop', email: 'awa.diop@dit.sn', phone: '+221 77 123 45 67', type: 'etudiant' },
  { fullName: 'Moussa Ndiaye', email: 'moussa.ndiaye@dit.sn', phone: '+221 76 987 65 43', type: 'professeur' },
  { fullName: 'Fatou Sall', email: 'fatou.sall@externe.com', phone: '+221 70 555 11 22', type: 'externe' },
  { fullName: 'Ibrahima Fall', email: 'ibrahima.fall@dit.sn', phone: '+221 78 222 33 44', type: 'etudiant' },
  { fullName: 'Coumba Ba', email: 'coumba.ba@dit.sn', phone: '+221 77 444 55 66', type: 'etudiant' },
  { fullName: 'Cheikh Sy', email: 'cheikh.sy@dit.sn', phone: '+221 76 111 22 33', type: 'professeur' }
];

async function main() {
  console.log('Creation des evenements...');
  const events = [];
  for (const event of EVENTS) {
    events.push(await post(`${EVENTS_URL}/events`, event));
  }
  console.log(`  ${events.length} evenements crees`);

  console.log('Creation des participants...');
  const participants = [];
  for (const participant of PARTICIPANTS) {
    participants.push(await post(`${PARTICIPANTS_URL}/participants`, participant));
  }
  console.log(`  ${participants.length} participants crees`);

  console.log('Creation des inscriptions...');
  // [index de l evenement, index du participant]
  // L atelier Docker (index 1) est rempli a ras bord : 6 places, 6 inscrits.
  const pairs = [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 1], [2, 5],
    [3, 2], [3, 3], [3, 4]
  ];

  let count = 0;
  for (const [eventIndex, participantIndex] of pairs) {
    await post(`${REGISTRATIONS_URL}/registrations`, {
      eventId: events[eventIndex].id,
      participantId: participants[participantIndex].id
    });
    count += 1;
  }
  console.log(`  ${count} inscriptions creees`);

  const stats = await fetch(`${REGISTRATIONS_URL}/registrations/stats`).then((r) => r.json());
  console.log('\nStatistiques :', JSON.stringify(stats, null, 2));
  console.log('\nJeu de donnees de demonstration installe.');
}

main().catch((error) => {
  console.error('Echec du seed :', error.message);
  console.error('Verifiez que les trois microservices sont demarres et joignables.');
  process.exit(1);
});
