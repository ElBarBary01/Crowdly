import Link from "next/link";
import MobileNavbar from "../mobileNavbar";
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
          <Link className={styles.login} href="/login">
            Log in
          </Link>
          <Link className={styles.signup} href="/signup">
            Sign up
          </Link>
        </div>
      </header>

      <div className={styles.mobileNavigation}>
        <MobileNavbar />
      </div>
    </>
  );
}
