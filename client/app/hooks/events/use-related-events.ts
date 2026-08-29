import { useQuery } from "@tanstack/react-query";

type RelatedEvent = {
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

export const useRelatedEvents = (id: string) => {
  return useQuery<RelatedEvent[]>({
    queryKey: ["related-events", id],

    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/${id}/related`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch related events");
      }

      const result = await response.json();

      return result.data || [];
    },

    enabled: !!id,
  });
};
