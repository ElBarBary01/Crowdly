import { isTicketType, type TicketType, type Venue } from "./venue";

export type EventVenue = Venue & {
  /** Event-scoped value computed from Event.tickets; it is not persisted on Venue. */
  ticketsLeft: number;
};

export type Event = {
  id: string;
  title: string;
  date: Date;
  time: string;
  genres: string[];
  venueId: string;
  venue: EventVenue;
  tickets: EventTicket[];
};

export type EventTicket = {
  type: TicketType;
  price: number;
  quantity: number;
  description: string | null;
};

export type EventTicketInput = Omit<EventTicket, "description"> & {
  description?: string | null;
};

export function getTicketsLeft(
  tickets: readonly Pick<EventTicket, "quantity">[],
): number {
  return tickets.reduce((total, ticket) => total + ticket.quantity, 0);
}

export function areEventTickets(value: unknown): value is EventTicketInput[] {
  if (!Array.isArray(value) || value.length === 0) return false;

  const types = new Set<TicketType>();
  return value.every((ticket) => {
    if (
      typeof ticket !== "object" ||
      ticket === null ||
      !isTicketType(ticket.type) ||
      types.has(ticket.type) ||
      typeof ticket.price !== "number" ||
      !Number.isFinite(ticket.price) ||
      ticket.price < 0 ||
      !Number.isInteger(ticket.quantity) ||
      ticket.quantity < 0 ||
      !(
        ticket.description === undefined ||
        ticket.description === null ||
        typeof ticket.description === "string"
      )
    ) {
      return false;
    }

    types.add(ticket.type);
    return true;
  });
}

export type CreateEventDto = {
  title: string;
  date: string;
  time: string;
  genres: string[];
  venueId: string;
  artistsIds: string[];
  tickets: EventTicketInput[];
};

export type UpdateEventDto = {
  title?: string;
  date?: string;
  time?: string;
  genres?: string[];
  venueId?: string;
  artistsIds?: string[];
  tickets?: EventTicketInput[];
};
export type GetEventsQuery = {
  sort?: "date" | "title";
  order?: "asc" | "desc";
  genre?: string;
  venueId?: string;
  page?: number;
  limit?: number;
};
