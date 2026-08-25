import Link from "next/link";
import styles from "./footer.module.css";

const footerColumns = [
  {
    title: "Discover",
    links: [
      { label: "Events", href: "/events" },
      { label: "Venues", href: "/venues" },
      { label: "Artists", href: "/artists" },
      { label: "Festivals", href: "/festivals" },
      { label: "Tours", href: "/tours" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Tickets", href: "/tickets" },
      { label: "Order History", href: "/orders" },
      { label: "Favorites", href: "/favorites" },
      { label: "Settings", href: "/settings" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
    ],
  },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.main}>
        <div className={styles.brand}>
          <Link className={styles.brandLink} href="/" aria-label="Crowdly home">
            <span className={styles.mark} aria-hidden="true">
              C
            </span>
            <span className={styles.wordmark}>Crowdly</span>
          </Link>
          <p className={styles.tagline}>
            The premier destination for live music tickets. Discover,
            experience, remember.
          </p>
        </div>

        {footerColumns.map((column) => (
          <div className={styles.column} key={column.title}>
            <h3 className={styles.columnTitle}>{column.title}</h3>
            <ul className={styles.columnList}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className={styles.columnLink} href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <hr className={styles.divider} />

      <div className={styles.bottom}>
        <span className={styles.copyright}>
          © {new Date().getFullYear()} Stagefront, Inc. All rights reserved.
        </span>

        <div className={styles.legal}>
          {legalLinks.map((link) => (
            <Link className={styles.legalLink} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.payments}>
          <span>VISA</span>
          <span>MC</span>
          <span>AMEX</span>
          <span>PayPal</span>
        </div>
      </div>
    </footer>
  );
}
