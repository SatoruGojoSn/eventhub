import { REGISTRATION_STATUS } from '../config.js';
import { conflict, notFound } from '../errors.js';

/**
 * Logique metier des inscriptions.
 *
 * C'est ici qu'est orchestree la communication inter-services :
 * une inscription n'est acceptee que si l'evenement existe, que le participant
 * existe, qu'il reste des places et que le participant n'est pas deja inscrit.
 */
export function createRegistrationService({
  repository,
  eventsClient,
  participantsClient
}) {
  const requireEvent = async (eventId) => {
    const event = await eventsClient.getEvent(eventId);
    if (!event) throw notFound(`Evenement ${eventId} introuvable`);
    return event;
  };

  const requireParticipant = async (participantId) => {
    const participant = await participantsClient.getParticipant(participantId);
    if (!participant) throw notFound(`Participant ${participantId} introuvable`);
    return participant;
  };

  /** Detection des places disponibles avant inscription. */
  const checkAvailability = async (eventId) => {
    const event = await requireEvent(eventId);
    const registered = await repository.countConfirmedByEvent(eventId);
    const remaining = Math.max(event.capacity - registered, 0);

    return {
      eventId: event.id,
      title: event.title,
      eventDate: event.eventDate,
      location: event.location,
      capacity: event.capacity,
      registered,
      remaining,
      available: remaining > 0
    };
  };

  return {
    checkAvailability,

    async register({ eventId, participantId }) {
      // 1. Les deux ressources distantes doivent exister.
      const [event, participant] = await Promise.all([
        requireEvent(eventId),
        requireParticipant(participantId)
      ]);

      // 2. Pas de double inscription.
      const existing = await repository.findConfirmed(eventId, participantId);
      if (existing) {
        throw conflict(
          `Le participant ${participantId} est deja inscrit a l evenement ${eventId}`
        );
      }

      // 3. Controle de capacite.
      const registered = await repository.countConfirmedByEvent(eventId);
      if (registered >= event.capacity) {
        throw conflict(
          `Evenement complet : ${registered}/${event.capacity} places occupees`
        );
      }

      const registration = await repository.create({ eventId, participantId });

      return {
        ...registration,
        event: { id: event.id, title: event.title, eventDate: event.eventDate, location: event.location },
        participant: {
          id: participant.id,
          fullName: participant.fullName,
          email: participant.email,
          type: participant.type
        },
        remainingSeats: Math.max(event.capacity - (registered + 1), 0)
      };
    },

    async cancel(id) {
      const registration = await repository.findById(id);
      if (!registration) throw notFound(`Inscription ${id} introuvable`);
      if (registration.status === REGISTRATION_STATUS.CANCELLED) {
        throw conflict(`L inscription ${id} est deja annulee`);
      }
      return repository.cancel(id);
    },

    /** Inscriptions d'un evenement, enrichies avec le profil des participants. */
    async listByEvent(eventId, { status } = {}) {
      const event = await requireEvent(eventId);
      const registrations = await repository.findAll({ eventId, status });

      const enriched = await Promise.all(
        registrations.map(async (registration) => {
          // La degradation est volontairement douce : si participants-service
          // ne repond pas, on renvoie l'inscription sans le detail du profil.
          const participant = await participantsClient
            .getParticipant(registration.participantId)
            .catch(() => null);
          return { ...registration, participant };
        })
      );

      return {
        event: { id: event.id, title: event.title, capacity: event.capacity },
        count: enriched.length,
        data: enriched
      };
    },

    /** Evenements auxquels un participant est inscrit. */
    async listEventsOfParticipant(participantId, { status } = {}) {
      const participant = await requireParticipant(participantId);
      const registrations = await repository.findAll({ participantId, status });

      const enriched = await Promise.all(
        registrations.map(async (registration) => {
          const event = await eventsClient
            .getEvent(registration.eventId)
            .catch(() => null);
          return { ...registration, event };
        })
      );

      return {
        participant: {
          id: participant.id,
          fullName: participant.fullName,
          email: participant.email
        },
        count: enriched.length,
        data: enriched
      };
    },

    /** Statistiques globales, enrichies du titre de chaque evenement. */
    async stats() {
      const stats = await repository.globalStats();

      const byEvent = await Promise.all(
        stats.byEvent.map(async (entry) => {
          const event = await eventsClient.getEvent(entry.eventId).catch(() => null);
          return {
            ...entry,
            title: event?.title ?? null,
            capacity: event?.capacity ?? null,
            fillRate:
              event?.capacity > 0
                ? Number(((entry.confirmed / event.capacity) * 100).toFixed(1))
                : null
          };
        })
      );

      return { ...stats, byEvent };
    }
  };
}
