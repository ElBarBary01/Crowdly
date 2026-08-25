import React from "react";
import "./Badge.css";

export type BadgeVariant =
  | "success"
  | "error"
  | "warning"
  | "neutral"
  | "purple"
  | "pink"
  | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const classNames = ["badge", variant, className || ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames} {...rest}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
