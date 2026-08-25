import React from "react";

export const CardImage: React.FC<{ src: string; alt: string; children?: React.ReactNode }> = ({
  src,
  alt,
  children,
}) => (
  <div className="card-image-wrapper">
    <img src={src} alt={alt} className="card-image" />
    {children}
  </div>
);

export const Avatar: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <img src={src} alt={alt} className="card-avatar" />
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`card-body ${className}`}>{children}</div>;

export const CardRow: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = "",
  style,
}) => (
  <div className={`card-row ${className}`} style={style}>
    {children}
  </div>
);

export const Badge: React.FC<{ variant: "overlay" | "success"; children: React.ReactNode }> = ({
  variant,
  children,
}) => (
  <span className={variant === "overlay" ? "badge-overlay" : "badge-success"}>
    {children}
  </span>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="card-title">{children}</h3>
);

export const CardSubtext: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <p className="card-subtext" style={style}>
    {children}
  </p>
);

export const CardPrice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="card-price">{children}</span>
);

export const CardCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="card-code">{children}</span>
);

export const CardButton: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({
  children,
  onClick,
}) => (
  <button className="btn-purple" onClick={onClick}>
    {children}
  </button>
);

export const CardMetaInline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="card-meta-inline">{children}</div>
);