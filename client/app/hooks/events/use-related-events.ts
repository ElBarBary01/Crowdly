import { useQuery } from "@tanstack/react-query";
import { RelatedEvent } from "../../types/event";

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
