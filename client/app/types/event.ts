export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  images: string[];
  venue: {
    name: string;
  };
  tickets: {
    price: number;
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
