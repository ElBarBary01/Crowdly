import type { ReactNode } from "react";
import styles from "./toastSnackbar.module.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastSnackbarProps {
  message: ReactNode;
  type?: ToastType;
  icon?: ReactNode;
  className?: string;
}

const defaultIcons: Record<ToastType, string> = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

export default function ToastSnackbar({
  message,
  type = "info",
  icon,
  className = "",
}: ToastSnackbarProps) {
  const role = type === "error" || type === "warning" ? "alert" : "status";

  return (
    <div
      className={`${styles.toastSnackbar} ${styles[type]} ${className}`.trim()}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon ?? defaultIcons[type]}
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  );
}
