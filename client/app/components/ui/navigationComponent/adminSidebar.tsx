import Link from "next/link";
import styles from "./adminSidebar.module.css";

type AdminNavigationItemId = "dashboard" | "events" | "orders" | "users";

interface AdminSidebarProps {
  activeItem?: AdminNavigationItemId;
}

const navigationItems: Array<{
  id: AdminNavigationItemId;
  label: string;
  href: string;
  icon: string;
}> = [
  { id: "dashboard", label: "Dashboard", href: "/admin", icon: "\u{1F4CA}" },
  { id: "events", label: "Events", href: "/admin/events", icon: "\u{1F3A4}" },
  { id: "orders", label: "Orders", href: "/admin/orders", icon: "\u{1F9FE}" },
  { id: "users", label: "Users", href: "/admin/users", icon: "\u{1F465}" },
];

export default function AdminSidebar({
  activeItem = "dashboard",
}: AdminSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Admin navigation">
      <header className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">
          A
        </span>

        <span className={styles.identity}>
          <span className={styles.name}>Admin</span>
          <span className={styles.role}>Super Admin</span>
        </span>
      </header>

      <nav className={styles.navigation} aria-label="Admin sections">
        {navigationItems.map((item) => {
          const isActive = item.id === activeItem;

          return (
            <Link
              className={`${styles.navigationItem} ${isActive ? styles.active : ""}`}
              href={item.href}
              key={item.id}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.navigationIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles.navigationLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
