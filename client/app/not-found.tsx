import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.subtitle}>
        The show you&apos;re looking for has moved or never existed.
      </p>
      <Link href="/" className={styles.homeButton}>
        Back to Home
      </Link>
    </div>
  );
}
