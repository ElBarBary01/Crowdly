import "./ToggleSwitch.css";
import { useState } from "react";

type ToggleSwitchProps = {
  isOn?: boolean;
  label?: string;
};

export default function ToggleSwitch({
  isOn = false,
  label,
}: ToggleSwitchProps) {
  const [checked, setChecked] = useState(isOn);

  return (
    <div className="toggle-row">
      {label && <span className="toggle-label">{label}</span>}
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => setChecked(!checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
