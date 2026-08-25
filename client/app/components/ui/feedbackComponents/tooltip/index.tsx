"use client";

import { useId, type ReactNode } from "react";
import styles from "./tooltip.module.css";

export type TooltipPosition = "top" | "bottom" | "right";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const tooltipId = useId();

  return (
    <span
      className={`${styles.tooltip} ${className}`.trim()}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      {children}
      <span
        className={`${styles.content} ${styles[position]}`}
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
