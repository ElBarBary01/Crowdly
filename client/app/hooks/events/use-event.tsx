import { useQuery } from "@tanstack/react-query";
import { Event } from "../../types/event";

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
