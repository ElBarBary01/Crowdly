import { useQuery } from "@tanstack/react-query";
import type { EventTicket, StageVenue } from "../../components/ui/stage/types";
type Event = {
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

export const useEvent = (id: string) => {
  return useQuery<Event>({
    queryKey: ["event", id],

    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/${id}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.status}`);
      }

      const result = await response.json();

      return result.data;
    },

    enabled: !!id,
  });
};
