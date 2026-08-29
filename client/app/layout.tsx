// app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";
import styles from "./layout.module.css";
import "./globals.css";

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
        <Providers>
          <main className={styles.main}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
