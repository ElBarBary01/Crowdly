import type { EventTicket, StageVenue } from "../components/ui/stage/types";

export type Event = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  genres: string[];
  images: string[];

  venue: StageVenue & {
    name: string;
    location: string;
    description: string | null;
    amenities: string[];
    policies: string[];
  };

  tickets: EventTicket[];

  artists?: {
    artist: {
      id: string;
      name: string;
      image?: string;
    };
  }[];
};

export type EventsResponse = {
  data: Event[];
  total: number;
  totalPages: number;
};

export type UseEventsParams = {
  sort: string;
  order: string;
  genre: string;
  page: number;
};

export type RelatedEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  images: string[];
  venue: {
    name: string;
    address?: string;
    location: string;
    description?: string;
    capacity: number;
    stageType: string;
    amenities: string[];
    policies: string[];
    ticketsLeft: number;
  };
  tickets: {
    price: number;
  }[];
};
