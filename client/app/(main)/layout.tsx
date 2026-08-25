// app/layout.tsx
import type { Metadata } from "next";
import TopNavbar from "../components/ui/navigationComponent/topNavbar";
import styles from "./layout.module.css";
import "../globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNavbar />
      <main className={styles.main}>{children}</main>
    </>
  );
}
