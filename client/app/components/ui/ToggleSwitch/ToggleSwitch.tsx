import "./ToggleSwitch.css";
import { useState } from "react";

type ToggleSwitchProps = {
  isOn?: boolean;
};

export default function ToggleSwitch({ isOn = false }: ToggleSwitchProps) {
  const [checked, setChecked] = useState(isOn);

  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
      />
      <span className="toggle-slider"></span>
    </label>
  );
}
