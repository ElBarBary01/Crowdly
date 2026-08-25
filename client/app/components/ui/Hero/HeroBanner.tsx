import React from "react";
import "./HeroBanner.css";

export type HeroBannerOverlay = "dark" | "light" | "none";

export interface HeroBannerProps {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  children?: React.ReactNode;
  overlay?: HeroBannerOverlay;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  backgroundImage,
  children,
  overlay = "dark",
}) => {
  const rootClassName = ["hero-banner", `hero-banner--overlay-${overlay}`]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={rootClassName}
      style={{ backgroundImage: `url(${backgroundImage})` }}
      data-testid="hero-banner"
    >
      <div className="hero-banner__content">
        <h1 className="hero-banner__title">{title}</h1>
        {subtitle && <p className="hero-banner__subtitle">{subtitle}</p>}
        {children && <div className="hero-banner__children">{children}</div>}
      </div>
    </section>
  );
};

export default HeroBanner;
