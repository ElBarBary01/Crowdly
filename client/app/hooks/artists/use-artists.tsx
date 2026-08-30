import { ArtistType } from "../../types/artist";
import { useQuery } from "@tanstack/react-query";

export const useArtists = () => {
  return useQuery<ArtistType[]>({
    queryKey: ["artists"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/artist`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch artists");

      const data = await response.json();
      return data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};
