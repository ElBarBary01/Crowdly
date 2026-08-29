import { useQuery } from "@tanstack/react-query";

type Event = {
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

type EventsResponse = {
  data: Event[];
  total: number;
  totalPages: number;
};

type UseEventsParams = {
  sort: string;
  order: string;
  genre: string;
  page: number;
};

export const useEvents = ({ sort, order, genre, page }: UseEventsParams) => {
  return useQuery<EventsResponse>({
    queryKey: ["events", sort, order, genre, page],

    queryFn: async () => {
      const params = new URLSearchParams();

      if (sort) {
        params.append("sort", sort);
        params.append("order", order);
      }

      if (genre) {
        params.append("genre", genre);
      }

      params.append("page", page.toString());

      const queryString = params.toString();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event${
          queryString ? `?${queryString}` : ""
        }`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      return response.json();
    },
  });
};
