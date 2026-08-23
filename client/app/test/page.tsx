"use client";

import "./styles.css";
import { useState } from "react";
import ToggleSwitch from "../components/ui/ToggleSwitch/ToggleSwitch";

export default function TestPage() {
  const [isToggleOn, setIsToggleOn] = useState(false);

  const handleToggleChange = (isOn: boolean) => {
    setIsToggleOn(isOn);
  };

  return (
    <main className="container">
      <ToggleSwitch
        label="Notifications"
        isOn={isToggleOn}
        onChange={handleToggleChange}
      />
      <p>Toggle: {isToggleOn ? "ON" : "OFF"}</p>
    </main>
  );
}
