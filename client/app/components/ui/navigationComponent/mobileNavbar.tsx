import Link from "next/link";
import styles from "./mobileNavbar.module.css";

type MobileNavigationItemId =
  | "home"
  | "explore"
  | "tickets"
  | "saved"
  | "account";

interface MobileNavbarProps {
  activeItem?: MobileNavigationItemId;
}

const navigationItems: Array<{
  id: MobileNavigationItemId;
  label: string;
  href: string;
  icon: string;
}> = [
  { id: "home", label: "Home", href: "/", icon: "🏠" },
  { id: "explore", label: "Explore", href: "/explore", icon: "🔍" },
  { id: "tickets", label: "Tickets", href: "/tickets", icon: "🎟️" },
  { id: "saved", label: "Saved", href: "/saved", icon: "♥" },
  { id: "account", label: "Account", href: "/account", icon: "👤" },
];

export default function MobileNavbar({
  activeItem = "home",
}: MobileNavbarProps) {
  return (
    <nav className={styles.navigation} aria-label="Mobile navigation">
      <div className={styles.navigationBar}>
        {navigationItems.map((item) => {
          const isActive = item.id === activeItem;

          return (
            <Link
              className={`${styles.navigationItem} ${isActive ? styles.active : ""}`}
              href={item.href}
              key={item.id}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
