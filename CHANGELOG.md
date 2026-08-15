# Changelog

Toutes les évolutions notables d'EventHub sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.0.0] — 15 août 2026

Première version complète de la plateforme EventHub.

### Ajouté

**Microservices backend**
- `events-service` (port 3001) : CRUD complet des événements, filtres par
  date/lieu/recherche, contrôle de disponibilité (places restantes via le
  service inscriptions)
- `participants-service` (port 3002) : CRUD des participants
  (étudiant/professeur/externe), recherche par email ou nom, unicité email
- `registrations-service` (port 3003) : inscriptions/annulations, contrôle
  de capacité avant inscription, statistiques globales et par événement,
  taux de remplissage, index unique partiel anti double-inscription

**Frontend**
- Interface React 18 (Vite) : tableau de bord consolidé, pages Événements,
  Participants et Inscriptions avec CRUD complet
- Reverse proxy Nginx (`/api`) → aucune problématique CORS

**Infrastructure / DevOps**
- Base PostgreSQL avec pattern database-per-service (3 schémas)
- Dockerfiles multi-stage durcis (Alpine, utilisateur non-root, healthchecks)
- Docker Compose : orchestration des 6 conteneurs avec dépendances saines
- Script de seed de démonstration (`scripts/seed-demo.mjs`)
- Pipeline GitHub Actions : tests parallèles, build frontend, images Docker
  poussées sur GHCR, déploiement SSH automatique sur `main`
- Tests unitaires sur les 3 services (62 tests)

**Documentation**
- README complet (installation manuelle, Docker, API, CI/CD)
- Rapport de projet (Markdown + PDF) avec captures d'écran

## [0.1.0] — 5 août 2026

- Initialisation du dépôt (gitignore, structure, README de démarrage)
- Script d'initialisation PostgreSQL (3 bases)
