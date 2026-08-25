import Link from "next/link";
import styles from "./breadCrumbs.module.css";

const breadcrumbItems = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Hip-Hop", href: "/events/hip-hop" },
  { label: "Kendrick Lamar" },
];

export default function BreadCrumbs() {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const isCurrentPage = !item.href;

        return (
          <span className={styles.group} key={item.label}>
            {index > 0 && (
              <span className={styles.separator} aria-hidden="true">
                /
              </span>
            )}

            <span
              className={`${styles.item} ${isCurrentPage ? styles.current : ""}`}
            >
              {item.href ? (
                <Link className={styles.link} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
