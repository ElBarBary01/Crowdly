import "./ToggleSwitch.css";
type ToggleSwitchProps = {
  isOn?: boolean;
  label?: string;
  onChange: (isOn: boolean) => void;
};
export default function ToggleSwitch({
  isOn = false,
  label,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className="toggle-row">
      {label && <span className="toggle-label">{label}</span>}

      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isOn}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
