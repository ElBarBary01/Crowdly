import "./RadioButton.css";
import { useState } from "react";

type RadioOption = {
  value: string;
  label: string;
};

type RadioButtonProps = {
  title?: string;
  options: RadioOption[];
  selected?: string;
  onChange: (value: string) => void;
  name?: string;
};

export default function RadioButton({
  title,
  options,
  selected,
  onChange,
  name = "radio-group",
}: RadioButtonProps) {
  const currentValue = selected ?? options[0]?.value;
  return (
    <div className="radio-group">
      {title && <h3 className="radio-group-title">{title}</h3>}

      <div className="radio-group-options">
        {options.map((option) => (
          <label key={option.value} className="radio-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={currentValue === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="radio-dot"></span>
            <span className="radio-label">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
