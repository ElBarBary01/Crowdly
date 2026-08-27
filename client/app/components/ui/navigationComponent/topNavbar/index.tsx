"use client";

import Link from "next/link";
import MobileNavbar from "../mobileNavbar";
import ProfileMenu from "../../ProfileMenu";
import styles from "./topNavbar.module.css";

const navigationItems = [
  { label: "Events", href: "/events" },
  { label: "Venues", href: "/venues" },
  { label: "Artists", href: "/artists" },
];

export default function TopNavbar() {
  return (
    <>
      <header className={styles.topNavbar}>
        <Link className={styles.brand} href="/" aria-label="Crowdly home">
          <span className={styles.mark} aria-hidden="true">
            C
          </span>
          <span className={styles.wordmark}>Crowdly</span>
        </Link>

        <nav className={styles.navigation} aria-label="Main navigation">
          {navigationItems.map((item) => (
            <Link className={styles.navLink} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.account}>
          <ProfileMenu />
        </div>
      </header>

      <div className={styles.mobileNavigation}>
        <MobileNavbar />
      </div>
    </>
  );
}
