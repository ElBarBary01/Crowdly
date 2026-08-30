"use client";

import { useUser } from "../hooks/user/use-user";
import { useHomeData } from "../hooks/home/use-home-data";
import TrendingCarousel from "../components/home/TrendingCarousel/TrendingCarousel";
import BrowseByGenre from "../components/home/BrowseByGenre/BrowseByGenre";
import UpcomingEventSection from "../components/home/UpcomingEvents/UpcomingEvents";
import Skeleton from "../components/ui/skeleton/Skeleton";
import FeaturedArtists from "../components/home/FeaturedArtist/FeaturedArtist";

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
      <UpcomingEventSection
        title="Upcoming near you"
        subtitle="Events happening in your area"
        loading={isLoading}
        skeletonCount={3}
        viewAllHref="/events"
        events={data.nearby}
      />
      <FeaturedArtists
        artists={data.artists}
        loading={isLoading}
        viewAllHref="/artists"
      />
    </div>
  );
}
