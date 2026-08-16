-- ---------------------------------------------------------------------------
-- EventHub - Initialisation du serveur PostgreSQL
--
-- Chaque microservice possede SA PROPRE base de donnees (pattern
-- "database per service"). Aucun service ne lit les tables d'un autre :
-- les donnees ne circulent que via les API REST.
--
-- Ce script est execute automatiquement par l'image officielle postgres
-- au tout premier demarrage (volume de donnees vide).
-- Les tables, elles, sont creees par chaque service a son demarrage
-- (voir src/db/pool.js -> runMigrations).
-- ---------------------------------------------------------------------------

CREATE DATABASE eventhub_events;
CREATE DATABASE eventhub_participants;
CREATE DATABASE eventhub_registrations;

GRANT ALL PRIVILEGES ON DATABASE eventhub_events        TO eventhub;
GRANT ALL PRIVILEGES ON DATABASE eventhub_participants  TO eventhub;
GRANT ALL PRIVILEGES ON DATABASE eventhub_registrations TO eventhub;
