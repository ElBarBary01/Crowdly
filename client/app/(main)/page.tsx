"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TrendingCarousel from "../components/home/TrendingCarousel/TrendingCarousel";
import Skeleton from "../components/ui/skeleton/Skeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }

  if (loading) {
    return (
        <div style={{ marginBottom: "40px" }}>
          <Skeleton width="100%" height="400px" variant="rectangular" animation="wave" />
        </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <TrendingCarousel/>
    </div>
  );
}
