"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserType } from "../types/user";
import { useUser } from "../hooks/user/use-user";
import TrendingCarousel from "../components/home/TrendingCarousel/TrendingCarousel";
import Skeleton from "../components/ui/skeleton/Skeleton";
import BrowseByGenre from "../components/home/BrowseByGenre/BrowseByGenre";
import TrendingEvents from "../components/home/TrendingEvents/TrendingEvents";
import FeaturedArtists from "../components/home/FeaturedArtists/FeaturedArtists";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function HomePage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useUser();

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

  return (
    <div className="home-content">
      <TrendingCarousel />
      <TrendingEvents />
      <BrowseByGenre />
      <FeaturedArtists />
    </div>
  );
}
