"use client";

import { useUser } from "../hooks/user/use-user";
import { useHomeData } from "../hooks/home/use-home-data";
import TrendingCarousel from "../components/home/TrendingCarousel/TrendingCarousel";
import BrowseByGenre from "../components/home/BrowseByGenre/BrowseByGenre";
import Skeleton from "../components/ui/skeleton/Skeleton";

export default function HomePage() {
  const { data: user } = useUser(); // still available for nav ("Log in" vs avatar)
  const { data, isLoading, isError } = useHomeData();

  if (isLoading) {
    return (
      <div style={{ marginBottom: "40px" }}>
        <Skeleton
          width="100%"
          height="400px"
          variant="rectangular"
          animation="wave"
        />
      </div>
    );
  }

  if (isError || !data) {
    return <div>Something went wrong loading the homepage.</div>;
  }

  return (
    <div>
      <TrendingCarousel />
      <BrowseByGenre genres={data.genres} />
    </div>
  );
}
