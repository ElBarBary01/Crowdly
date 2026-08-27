export type Event = {
  id: string;
  title: string;
  date: Date;
  time: string;
  genres: string[];
  venueId: string;
};

export type CreateEventTicket = {
  type: string;
  price: number;
  quantity: number;
};

export type CreateEventDto = {
  title: string;
  date: string;
  time: string;
  genres: string[];
  venueId: string;
  artistsIds: string[];
  tickets: CreateEventTicket[];
};

export type UpdateEventDto = {
  title?: string;
  date?: string;
  time?: string;
  genres?: string[];
  venueId?: string;
  artistsIds?: string[];
  tickets?: CreateEventTicket[];
};
export type GetEventsQuery = {
  sort?: "date" | "title";
  order?: "asc" | "desc";
  genre?: string;
  venueId?: string;
  page?: number;
  limit?: number;
};
