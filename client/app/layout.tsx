// app/layout.tsx
import type { Metadata } from "next";
import TopNavbar from "./components/ui/navigationComponent/topNavbar";
import styles from "./layout.module.css";
import "./globals.css";
import Footer from "./components/ui/footerComponent";

export const metadata: Metadata = {
  title: "Crowdly",
  description: "Discover events, venues, and artists near you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={styles.shell}>
        <TopNavbar />
        <main className={styles.main}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
