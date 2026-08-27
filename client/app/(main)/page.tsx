"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserType } from "../types/user";
import { useUser } from "../hooks/user/use-user";

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
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
