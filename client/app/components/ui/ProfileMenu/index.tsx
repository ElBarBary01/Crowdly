"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "../Avatar";
import { useUser } from "@/app/hooks/user/use-user";
import styles from "./profileMenu.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileMenu() {
  const { data: user, isLoading, isError } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    queryClient.setQueryData(["user-me"], null);
    router.push("/login");
  }

  if (isLoading) return null;

  if (isError || !user) {
    return (
      <div className={styles.authButtons}>
        <Link className={styles.login} href="/login">
          Log in
        </Link>
        <Link className={styles.signup} href="/signup">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar initials={getInitials(user.name)} size="sm" gradient />
        <div className={styles.info}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.email}>{user.email}</span>
        </div>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <Link
            href="/profile"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            className={styles.dropdownItem}
            role="menuitem"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
