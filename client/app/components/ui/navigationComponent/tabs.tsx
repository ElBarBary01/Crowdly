"use client";

import { useState } from "react";
import styles from "./tabs.module.css";

type TabId = "overview" | "seating-chart" | "venue-info" | "reviews";

const tabItems: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "seating-chart", label: "Seating Chart" },
  { id: "venue-info", label: "Venue Info" },
  { id: "reviews", label: "Reviews" },
];

export default function Tabs() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
