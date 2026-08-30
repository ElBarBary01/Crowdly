"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserType } from "../types/user";
import { useUser } from "../hooks/user/use-user";
import TrendingCarousel from "../components/home/TrendingCarousel/TrendingCarousel";
import Skeleton from "../components/ui/skeleton/Skeleton";
import BrowseByGenre from "../components/home/BrowseByGenre/BrowseByGenre";
import TrendingEvents from "../components/home/TrendingEvents/TrendingEvents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function HomePage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useUser();
  console.log(user?.name);
  console.log(isLoading);

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.push("/login");
    }
  }, [isLoading, isError, user, router]);

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }

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

  if (!user) {
    return null;
  }

  return (
    <div className="home-content">
      <TrendingCarousel />
      <TrendingEvents />
      <BrowseByGenre />
    </div>
  );
}
