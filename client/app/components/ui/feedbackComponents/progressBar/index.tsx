import type { ReactNode } from "react";
import styles from "./progressBar.module.css";

export type ProgressBarTone = "success" | "warning" | "error" | "info";

export interface ProgressBarProps {
  value: number;
  label?: ReactNode;
  percentageLabel?: ReactNode;
  tone?: ProgressBarTone;
  showPercentage?: boolean;
  ariaLabel?: string;
  className?: string;
}

function getAutomaticTone(value: number): ProgressBarTone {
  if (value >= 90) return "error";
  if (value >= 60) return "warning";
  return "success";
}

export default function ProgressBar({
  value,
  label,
  percentageLabel,
  tone,
  showPercentage = true,
  ariaLabel = "Progress",
  className = "",
}: ProgressBarProps) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 100)
    : 0;
  const resolvedTone = tone ?? getAutomaticTone(safeValue);

  return (
    <div className={`${styles.progressBar} ${className}`.trim()}>
      {(label || showPercentage) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showPercentage && (
            <span className={styles.percentage}>
              {percentageLabel ?? `${safeValue}%`}
            </span>
          )}
        </div>
      )}

      <progress
        className={`${styles.track} ${styles[resolvedTone]}`}
        value={safeValue}
        max={100}
        aria-label={ariaLabel}
      >
        {safeValue}%
      </progress>
    </div>
  );
}
