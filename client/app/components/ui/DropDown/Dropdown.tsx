import { useState, useRef, useEffect } from "react";
import "./Dropdown.css";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function Dropdown({ options, value, onChange, label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setIsOpen(false);
  }

  return (
    <div className="dropdown" ref={wrapperRef}>
      {label && <label className="dropdown__label">{label}</label>}

      <button
        type="button"
        className={
          isOpen
            ? "dropdown__button dropdown__button--open"
            : "dropdown__button"
        }
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : "Select..."}</span>
        <span
          className={
            isOpen ? "dropdown__arrow dropdown__arrow--open" : "dropdown__arrow"
          }
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <ul className="dropdown__list">
          {options.map((option) => (
            <li
              key={option.value}
              className={
                option.value === value
                  ? "dropdown__option dropdown__option--selected"
                  : "dropdown__option"
              }
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
