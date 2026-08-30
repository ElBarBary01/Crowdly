import { useQuery } from "@tanstack/react-query";
import { Event } from "../../types/event";

export const useTrendingEvents = () => {
  return useQuery<Event[]>({
    queryKey: ["trending-events"],

    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/trending`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch trending events: ${response.status}`);
      }

      const result = await response.json();

      return result.data;
    },
  });
};
