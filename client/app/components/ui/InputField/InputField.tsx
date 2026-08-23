import { useState, useId, forwardRef, InputHTMLAttributes } from "react";
import "./InputField.css";

export interface InputFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label: string;
  error?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, type = "text", error, ...rest }, ref) => {
    const id = useId();
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    // if password, switch between hidden dots and visible text
    const inputType = isPassword && showPassword ? "text" : type;

    // build the className as one simple string
    let inputClass = "input-field__input";
    if (isPassword) inputClass += " input-field__input--with-toggle";
    if (error) inputClass += " input-field__input--error";

    return (
      <div className="input-field">
        <label htmlFor={id} className="input-field__label">
          {label}
        </label>

        <div className="input-field__wrapper">
          <input
            {...rest}
            ref={ref}
            id={id}
            type={inputType}
            className={inputClass}
          />

          {isPassword && (
            <button
              type="button"
              className="input-field__toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          )}
        </div>

        {error && <span className="input-field__error">{error}</span>}
      </div>
    );
  },
);

export default InputField;
