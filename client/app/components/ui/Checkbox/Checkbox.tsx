import "./Checkbox.css";

type CheckboxProps = {
  checked: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function Checkbox({
  checked,
  label,
  onChange,
  disabled = false,
}: CheckboxProps) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />

      <span className="checkbox-custom"></span>

      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
}
