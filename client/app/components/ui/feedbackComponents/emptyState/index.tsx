"use client";

import type { ReactNode } from "react";
import styles from "./emptyState.module.css";

export interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
  actionAriaLabel?: string;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionAriaLabel,
  className = "",
}: EmptyStateProps) {
  return (
    <section className={`${styles.emptyState} ${className}`.trim()}>
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>

      {actionLabel && (
        <button
          className={styles.action}
          type="button"
          onClick={onAction}
          aria-label={actionAriaLabel}
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}
