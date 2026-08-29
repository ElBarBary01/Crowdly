"use client";

import { useState } from "react";
import styles from "./tabs.module.css";

type TabId = "overview" | "seating-chart" | "venue-info" | "reviews";

const tabItems: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "seating-chart", label: "Seating Chart" },
  { id: "venue-info", label: "Venue Info" },
];

interface TabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Event details">
      {tabItems.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
