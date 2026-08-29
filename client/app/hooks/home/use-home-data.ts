import { HomeData } from "../../types/home";
import { useQuery } from "@tanstack/react-query";

interface UseHomeDataParams {
  lat?: number;
  lng?: number;
  city?: string;
}

export const useHomeData = ({ lat, lng, city }: UseHomeDataParams = {}) => {
  return useQuery<HomeData>({
    queryKey: ["home"],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (lat != null) searchParams.set("lat", String(lat));
      if (lng != null) searchParams.set("lng", String(lng));
      if (city) searchParams.set("city", city);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/home?${searchParams.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch home data");
      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
