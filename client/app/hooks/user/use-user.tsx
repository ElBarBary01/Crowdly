import { UserType } from "../../types/user";
import { useQuery } from "@tanstack/react-query";

export const useUser = () => {
  return useQuery<UserType>({
    queryKey: ["user-me"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data.user;
    },
  });
};
