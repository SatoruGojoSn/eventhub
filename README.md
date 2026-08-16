# EventHub : Plateforme de gestion d'événements

> Examen pratique DevOps, Master 1 Intelligence Artificielle
> **Dakar Institute of Technology (DIT)**

EventHub est une plateforme web permettant au DIT de créer et gérer ses
événements académiques et culturels, d'inscrire des participants, de suivre la
capacité en temps réel et de consulter des statistiques consolidées.

L'application est construite selon une **architecture microservices** : trois
services backend indépendants, une base de données par service, un frontend
React, le tout conteneurisé avec Docker et déployé par un pipeline CI/CD
GitHub Actions.

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Architecture](#2-architecture)
3. [Prérequis techniques](#3-prérequis-techniques)
4. [Installation et lancement manuel](#4-installation-et-lancement-manuel)
5. [Docker : build et run service par service](#5-docker--build-et-run-service-par-service)
6. [Docker Compose (bonus)](#6-docker-compose-bonus)
7. [API : endpoints des microservices](#7-api--endpoints-des-microservices)
8. [Tests](#8-tests)
9. [Pipeline GitHub Actions](#9-pipeline-github-actions)
10. [Stratégie de branches](#10-stratégie-de-branches)
11. [Structure du projet](#11-structure-du-projet)
12. [Technologies utilisées](#12-technologies-utilisées)
13. [Auteurs](#13-auteurs)

---

## 1. Présentation

Avant EventHub, la gestion des événements du DIT reposait sur des outils
disparates (Google Forms, Excel, emails), sans suivi des inscriptions en temps
réel ni tableau de bord.

EventHub répond à ces limites :

| Besoin | Réponse apportée |
|---|---|
| Créer et gérer des événements | CRUD complet, filtres par date et par lieu |
| Gérer les inscriptions | Inscription, annulation, historique par participant |
| Suivre la capacité | Contrôle des places avant inscription, détection « complet » |
| Statistiques | Taux de remplissage global et par événement |
| Communication | Fiches participants (email, téléphone, type) exploitables |

---

## 2. Architecture

```
                        ┌───────────────────────────┐
                        │        Navigateur         │
                        └─────────────┬─────────────┘
                                      │  HTTP :8080
                        ┌─────────────▼─────────────┐
                        │  frontend (React + Nginx) │
                        │  SPA + passerelle /api/*  │
                        └──────┬───────┬───────┬────┘
                   /api/events │       │       │ /api/registrations
                               │       │ /api/participants
        ┌──────────────────────▼──┐ ┌──▼──────────────────────┐ ┌──▼─────────────────────────┐
        │   events-service :3001  │ │ participants-service    │ │ registrations-service      │
        │   CRUD événements       │ │ :3002                   │ │ :3003                      │
        │   disponibilité         │ │ CRUD participants       │ │ inscriptions, stats        │
        └───────────┬─────────────┘ └──────────┬──────────────┘ └────────────┬───────────────┘
                    │                          │                             │
                    │        REST interne      │                             │
                    │◄─────────────────────────┼─────────────────────────────┤
                    └──────────────────────────┼─────────────────────────────►
                                               │
                        ┌──────────────────────▼──────────────────────┐
                        │            PostgreSQL 16 (:5432)            │
                        │  eventhub_events │ eventhub_participants    │
                        │            │ eventhub_registrations         │
                        └─────────────────────────────────────────────┘
```

### Principes retenus

- **Une base de données par service.** Chaque microservice est le seul
  propriétaire de son schéma. Aucun service ne lit les tables d'un autre :
  toute donnée externe est obtenue par appel REST. C'est ce qui rend les
  services réellement indépendants (déploiement, évolution du schéma).
- **Communication REST synchrone.** `registrations-service` interroge
  `events-service` (capacité de l'événement) et `participants-service`
  (existence du participant) avant d'accepter une inscription.
  Symétriquement, `events-service` interroge `registrations-service` pour
  calculer les places restantes.
- **Nginx comme passerelle API.** Le frontend n'appelle jamais directement un
  port de service : il appelle `/api/<ressource>` et Nginx route vers le bon
  conteneur. Cela évite tout problème de CORS et masque la topologie interne.
- **Dégradation contrôlée.** Si un service distant est injoignable, l'API
  renvoie `503` avec un message explicite plutôt que `500` ; les listes
  enrichies (profils, titres) s'affichent sans l'information manquante.

---

## 3. Prérequis techniques

| Outil | Version minimale | Usage |
|---|---|---|
| Node.js | 22 LTS | Exécution des microservices et build du frontend |
| npm | 10 | Gestion des dépendances |
| PostgreSQL | 14 (16 recommandé) | Base de données relationnelle |
| Docker Engine | 24 | Conteneurisation |
| Docker Compose | v2 | Orchestration (bonus) |
| Git | 2.40 | Gestion de versions |

> Aucune dépendance externe n'est nécessaire pour les tests : ils utilisent des
> dépôts en mémoire et le lanceur de tests intégré à Node (`node --test`).

---

## 4. Installation et lancement manuel

### 4.1 Cloner le dépôt

```bash
git clone https://github.com/<utilisateur>/eventhub.git
cd eventhub
```

### 4.2 Préparer PostgreSQL

Créer l'utilisateur et les trois bases (une par microservice) :

```bash
psql -U postgres -c "CREATE USER eventhub WITH PASSWORD 'eventhub';"
psql -U postgres -c "CREATE DATABASE eventhub_events OWNER eventhub;"
psql -U postgres -c "CREATE DATABASE eventhub_participants OWNER eventhub;"
psql -U postgres -c "CREATE DATABASE eventhub_registrations OWNER eventhub;"
```

Les **tables** sont créées automatiquement au démarrage de chaque service
(`CREATE TABLE IF NOT EXISTS`, voir `src/db/pool.js`).

### 4.3 Configurer les variables d'environnement

Chaque service fournit un `.env.example` à copier :

```bash
cp events-service/.env.example        events-service/.env
cp participants-service/.env.example  participants-service/.env
cp registrations-service/.env.example registrations-service/.env
```

### 4.4 Lancer les services

Dans **quatre terminaux distincts** :

```bash
cd events-service && npm install && npm run dev
```

```bash
cd participants-service && npm install && npm run dev
```

```bash
cd registrations-service && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

| Composant | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| events-service | http://localhost:3001 |
| participants-service | http://localhost:3002 |
| registrations-service | http://localhost:3003 |

En développement, Vite joue le rôle de passerelle et redirige `/api/*` vers les
trois services (voir `frontend/vite.config.js`).

### 4.5 Charger un jeu de données de démonstration

```bash
node scripts/seed-demo.mjs
```

---

## 5. Docker : build et run service par service

Chaque composant possède son propre `Dockerfile` (build multi-étapes, image de
base Alpine, utilisateur non privilégié, `HEALTHCHECK`).

### 5.1 Construire les images

```bash
docker build -t eventhub/events-service:latest ./events-service
```

```bash
docker build -t eventhub/participants-service:latest ./participants-service
```

```bash
docker build -t eventhub/registrations-service:latest ./registrations-service
```

```bash
docker build -t eventhub/frontend:latest ./frontend
```

### 5.2 Réseau et base de données

```bash
docker network create eventhub-net
```

```bash
docker run -d --name eventhub-postgres --network eventhub-net -p 5432:5432 -e POSTGRES_USER=eventhub -e POSTGRES_PASSWORD=eventhub -e POSTGRES_DB=eventhub -v eventhub-pgdata:/var/lib/postgresql/data -v "$(pwd)/db/init:/docker-entrypoint-initdb.d:ro" postgres:16-alpine
```

### 5.3 Lancer les services

```bash
docker run -d --name eventhub-events --network eventhub-net -p 3001:3001 -e DB_HOST=postgres -e DB_NAME=eventhub_events -e DB_USER=eventhub -e DB_PASSWORD=eventhub -e REGISTRATIONS_SERVICE_URL=http://registrations-service:3003 eventhub/events-service:latest
```

```bash
docker run -d --name eventhub-participants --network eventhub-net -p 3002:3002 -e DB_HOST=postgres -e DB_NAME=eventhub_participants -e DB_USER=eventhub -e DB_PASSWORD=eventhub eventhub/participants-service:latest
```

```bash
docker run -d --name eventhub-registrations --network eventhub-net -p 3003:3003 -e DB_HOST=postgres -e DB_NAME=eventhub_registrations -e DB_USER=eventhub -e DB_PASSWORD=eventhub -e EVENTS_SERVICE_URL=http://events-service:3001 -e PARTICIPANTS_SERVICE_URL=http://participants-service:3002 eventhub/registrations-service:latest
```

```bash
docker run -d --name eventhub-frontend --network eventhub-net -p 8080:80 eventhub/frontend:latest
```

> Les conteneurs doivent porter le nom du service (`--name events-service`, …)
> ou être joints par alias réseau pour que la résolution DNS interne
> fonctionne. Docker Compose gère cela automatiquement, voir la section
> suivante.

### 5.4 Bonnes pratiques appliquées

| Bonne pratique | Mise en œuvre |
|---|---|
| Images légères | `node:22-alpine` et `nginx:1.27-alpine` |
| Build multi-étapes | Dépendances et build isolés de l'image finale |
| Bons ports exposés | 3001 / 3002 / 3003 / 80 |
| Configuration par variables d'environnement | Aucune valeur codée en dur |
| Volumes persistants | Volume nommé `postgres-data` |
| Sécurité | Exécution en `USER node`, pas de `root` |
| Supervision | `HEALTHCHECK` sur chaque image |
| Contexte de build réduit | Un `.dockerignore` par service |

---

## 6. Docker Compose (bonus)

Une seule commande suffit à démarrer toute la plateforme :

```bash
cp .env.example .env
```

```bash
docker compose up -d --build
```

| Service | URL |
|---|---|
| **Frontend** | **http://localhost:8080** |
| events-service | http://localhost:3001 |
| participants-service | http://localhost:3002 |
| registrations-service | http://localhost:3003 |
| PostgreSQL | localhost:5432 |

Commandes utiles :

```bash
docker compose ps
```

```bash
docker compose logs -f registrations-service
```

```bash
docker compose down
```

```bash
docker compose down -v
```

Charger les données de démonstration une fois la stack démarrée :

```bash
node scripts/seed-demo.mjs
```

Ce que `docker-compose.yml` apporte :

- création automatique du réseau `eventhub-net` ;
- **ordre de démarrage maîtrisé** grâce à `depends_on: condition:
  service_healthy`, les services attendent que PostgreSQL soit réellement
  prêt, pas seulement démarré ;
- création des trois bases au premier lancement via
  `db/init/01-create-databases.sql` ;
- volume nommé `postgres-data` pour la persistance.

---

## 7. API : endpoints des microservices

### 7.1 events-service (port 3001)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/events` | Créer un événement |
| `GET` | `/events` | Lister les événements (`?date=`, `?location=`, `?search=`, `?from=`, `?to=`) |
| `GET` | `/events/:id` | Détail d'un événement |
| `GET` | `/events/:id/availability` | Places restantes (appelle registrations-service) |
| `PUT` | `/events/:id` | Modifier un événement |
| `DELETE` | `/events/:id` | Supprimer un événement |
| `GET` | `/health` · `/ready` | Sondes de vivacité / disponibilité |

Modèle `Event` :

```json
{
  "id": 1,
  "title": "Conference IA & Afrique 2026",
  "description": "Conference annuelle du DIT...",
  "eventDate": "2026-09-15T09:00:00.000Z",
  "location": "Amphitheatre A - DIT Dakar",
  "capacity": 120,
  "createdAt": "2026-08-07T10:00:00.000Z",
  "updatedAt": "2026-08-07T10:00:00.000Z"
}
```

### 7.2 participants-service (port 3002)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/participants` | Créer un compte participant |
| `GET` | `/participants` | Lister (`?type=`, `?search=`, `?email=`, `?name=`) |
| `GET` | `/participants/search` | Recherche par `?email=` ou `?name=` |
| `GET` | `/participants/:id` | Détail d'un participant |
| `PUT` | `/participants/:id` | Modifier le profil |
| `DELETE` | `/participants/:id` | Supprimer un participant |
| `GET` | `/health` · `/ready` | Sondes |

Modèle `Participant` (`type` ∈ `etudiant` \| `professeur` \| `externe`, email unique) :

```json
{
  "id": 1,
  "fullName": "Awa Diop",
  "email": "awa.diop@dit.sn",
  "phone": "+221 77 123 45 67",
  "type": "etudiant",
  "createdAt": "2026-08-07T10:00:00.000Z",
  "updatedAt": "2026-08-07T10:00:00.000Z"
}
```

### 7.3 registrations-service (port 3003)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/registrations` | Inscrire un participant à un événement |
| `DELETE` | `/registrations/:id` | Annuler une inscription |
| `GET` | `/registrations` | Lister (`?eventId=`, `?participantId=`, `?status=`) |
| `GET` | `/registrations/:id` | Détail d'une inscription |
| `GET` | `/registrations/stats` | Statistiques globales et par événement |
| `GET` | `/registrations/stats/events/:eventId` | Compteurs d'un événement |
| `GET` | `/registrations/availability/:eventId` | Places disponibles avant inscription |
| `GET` | `/registrations/by-event/:eventId` | Inscriptions d'un événement |
| `GET` | `/registrations/by-participant/:id` | Événements d'un participant |
| `GET` | `/events/:eventId/registrations` | Alias REST du précédent |
| `GET` | `/participants/:id/events` | Alias REST du précédent |
| `GET` | `/health` · `/ready` | Sondes |

Modèle `Registration` (annulation = *soft delete*, statut `CANCELLED`) :

```json
{
  "id": 1,
  "eventId": 1,
  "participantId": 3,
  "status": "CONFIRMED",
  "registeredAt": "2026-08-07T10:05:00.000Z",
  "cancelledAt": null
}
```

### 7.4 Codes de retour

| Code | Signification |
|---|---|
| `200` / `201` / `204` | Succès |
| `400` | Payload invalide (le détail liste chaque erreur) |
| `404` | Ressource inexistante |
| `409` | Conflit : email déjà utilisé, double inscription, événement complet |
| `503` | Service dépendant injoignable |

Exemple d'inscription :

```bash
curl -X POST http://localhost:3003/registrations -H "Content-Type: application/json" -d '{"eventId":1,"participantId":3}'
```

---

## 8. Tests

Chaque microservice dispose de sa propre suite de tests unitaires
(`node:test`), exécutable sans base de données grâce aux **dépôts en mémoire**
injectés à la place des dépôts PostgreSQL.

```bash
cd events-service && npm test
```

```bash
cd participants-service && npm test
```

```bash
cd registrations-service && npm test
```

Couverture fonctionnelle : validation des payloads, filtres, codes HTTP,
contrôle de capacité, double inscription, annulation puis réinscription,
statistiques, et comportement lorsqu'un service distant est indisponible.

---

## 9. Pipeline GitHub Actions

Fichier : [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

| # | Étape | Job | Détail |
|---|---|---|---|
| 1 | **Checkout** | tous | `actions/checkout@v7` |
| 2 | **Setup** | tous | `actions/setup-node@v7` (Node 22 + cache npm) |
| 3 | **Tests** | `test-backend` | Matrice sur les 3 services, `npm ci` puis `npm test` |
| 4 | **Build** | `build-frontend` | `npm run build` (Vite) + artefact `frontend-dist` |
| 5 | **Docker Build** | `docker` | `docker/build-push-action@v7`, cache GitHub Actions |
| 6 | **Docker Push** | `docker` | Publication sur **GitHub Container Registry** (`ghcr.io`) |
| 7 | **Deploy** | `deploy` | SSH → `docker compose pull && up -d` + test de santé |

Déclencheurs : `push` sur `main` et `develop`, `pull_request` vers ces branches,
et déclenchement manuel (`workflow_dispatch`).

Points notables :

- **Parallélisation par matrice** : les 3 services sont testés simultanément,
  les 4 images sont construites simultanément.
- **`concurrency`** : une nouvelle exécution annule la précédente sur la même
  branche.
- **Tags d'images** : nom de branche, SHA court, et `latest` sur `main`.
- **Cache** : `cache: npm` pour les dépendances, `type=gha` pour les couches
  Docker.
- Le job `docker` ne s'exécute que sur `push` : une Pull Request lance les
  tests sans publier d'image.
- Le job `deploy` est limité à `main` et **ne casse pas la CI** si les secrets
  de déploiement ne sont pas configurés, il affiche alors la marche à suivre.

Secrets attendus pour activer le déploiement :

| Secret | Rôle |
|---|---|
| `DEPLOY_HOST` | Adresse du serveur cible |
| `DEPLOY_USER` | Utilisateur SSH |
| `DEPLOY_SSH_KEY` | Clé privée SSH |
| `DEPLOY_PORT` | *(optionnel)* port SSH, 22 par défaut |
| `DEPLOY_PATH` | *(optionnel)* chemin du projet sur le serveur |
| `DEPLOY_URL` | *(optionnel)* URL publique pour la vérification de santé |

---

## 10. Stratégie de branches

```
main ───────●──────────────●────────────────●──────►  production (déploiement auto)
             \            /                /
develop ──────●────●─────●───────●────────●─────────►  intégration continue
                    \         /
feature/xxx ─────────●───────●                          nouvelle fonctionnalité
```

| Branche | Rôle | CI |
|---|---|---|
| `main` | Production | Tests + build + push images + **déploiement** |
| `develop` | Intégration continue | Tests + build + push images (tag `develop`) |
| `feature/*` | Nouvelles fonctionnalités | Tests via Pull Request |
| `fix/*` | Corrections de bugs | Tests via Pull Request |

Flux de travail :

```bash
git checkout develop && git pull
```

```bash
git checkout -b feature/statistiques-inscriptions
```

```bash
git commit -m "feat(registrations): ajouter le taux de remplissage par evenement"
```

```bash
git push -u origin feature/statistiques-inscriptions
```

Puis ouvrir une Pull Request vers `develop` (un gabarit est fourni dans
`.github/pull_request_template.md`). Après validation et intégration, `develop`
est fusionnée dans `main`, ce qui déclenche le déploiement.

Convention de commits : [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`).

---

## 11. Structure du projet

```
eventhub/
├── .github/
│   ├── workflows/
│   │   └── ci-cd.yml                  # Pipeline CI/CD complet
│   └── pull_request_template.md
├── db/
│   └── init/
│       └── 01-create-databases.sql    # Création des 3 bases au 1er démarrage
├── events-service/                    # Microservice 1, événements
│   ├── src/
│   │   ├── clients/                   # Client REST vers registrations-service
│   │   ├── db/pool.js                 # Pool PostgreSQL + migrations
│   │   ├── repositories/              # Implémentations Postgres et en mémoire
│   │   ├── routes/events.js
│   │   ├── app.js                     # Application Express (injection de dépendances)
│   │   ├── config.js
│   │   ├── errors.js
│   │   ├── index.js                   # Point d'entrée
│   │   └── validation.js
│   ├── tests/                         # Tests unitaires (node:test)
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── participants-service/              # Microservice 2, participants (même structure)
├── registrations-service/             # Microservice 3, inscriptions
│   └── src/services/registration-service.js   # Logique métier + orchestration
├── frontend/                          # Interface React
│   ├── src/
│   │   ├── api/client.js              # Client HTTP unique vers /api
│   │   ├── components/
│   │   ├── pages/                     # Dashboard, Événements, Participants, Inscriptions
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── Dockerfile
│   ├── nginx.conf                     # Serveur statique + passerelle API
│   ├── proxy_headers.conf
│   └── vite.config.js
├── scripts/
│   └── seed-demo.mjs                  # Jeu de données de démonstration
├── docs/
│   └── RAPPORT.md                     # Rapport de projet
├── .env.example
├── .gitignore
├── docker-compose.yml                 # Orchestration complète (bonus)
└── README.md
```

---

## 12. Technologies utilisées

### Backend

- **Node.js 22** + **Express 4**, API REST des trois microservices
- **PostgreSQL 16** avec le pilote **`pg`** (requêtes paramétrées)
- **`node:test`**, lanceur de tests intégré, sans dépendance externe
- Architecture en couches : `routes` → `services` → `repositories`, avec
  **injection de dépendances** (le dépôt PostgreSQL est remplacé par un dépôt
  en mémoire dans les tests)

### Frontend

- **React 18** + **React Router 6**
- **Vite 5**, serveur de développement et build de production
- **CSS** natif (variables CSS, Grid, Flexbox), interface responsive

### DevOps

- **Docker**, build multi-étapes, images Alpine, `HEALTHCHECK`, utilisateur non root
- **Docker Compose**, orchestration des 5 conteneurs
- **Nginx 1.27**, service des fichiers statiques et passerelle API
- **GitHub Actions**, tests, build, publication d'images, déploiement
- **GitHub Container Registry (ghcr.io)**, registre d'images

---

## 13. Auteurs

| Nom | Rôle |
|---|---|
| **Makilou Cherif Tine** | Conception, développement backend, frontend et DevOps |

Projet réalisé individuellement.

**Encadrement :** Dakar Institute of Technology, Master 1 Intelligence Artificielle
**Période :** 5 août 2026 → 19 août 2026
