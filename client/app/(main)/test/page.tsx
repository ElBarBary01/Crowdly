"use client";

import "./styles.css";
import { useState } from "react";
import ToggleSwitch from "../../components/ui/ToggleSwitch/ToggleSwitch";
import Checkbox from "../../components/ui/Checkbox/Checkbox";

export default function TestPage() {
  const [isToggleOn, setIsToggleOn] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleToggleChange = (isOn: boolean) => {
    setIsToggleOn(isOn);
    console.log("Toggle:", isOn);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);
    console.log("Checkbox:", checked);
  };

  return (
    <main className="container">
      <Checkbox
        label="I agree to the terms and conditions"
        checked={isChecked}
        onChange={handleCheckboxChange}
      />

      <p>Checkbox: {isChecked ? "Checked" : "Not checked"}</p>

      <Checkbox
        label="Disabled checkbox"
        checked={false}
        onChange={() => {}}
        disabled
      />
    </main>
  );
}
