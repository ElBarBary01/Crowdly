"use client";

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Button from "../Button";
import { Card, CardContent } from "../card/card";
import "./VerifyPopup.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const OTP_LENGTH = 6;

interface VerifyPopupProps {
  email: string;
  onVerified?: () => void;
}

export default function VerifyPopup({ email, onVerified }: VerifyPopupProps) {
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpCode = otpDigits.join("");

  function focusOtpInput(index: number) {
    otpInputRefs.current[index]?.focus();
  }

  function setOtpValues(value: string, startIndex = 0) {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH - startIndex);
    const nextDigits = [...otpDigits];

    digits.split("").forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });

    setOtpDigits(nextDigits);
    if (otpError) setOtpError(undefined);

    const nextIndex = Math.min(startIndex + digits.length, OTP_LENGTH - 1);
    focusOtpInput(nextIndex);
  }

  function handleOtpKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      event.preventDefault();
      const nextDigits = [...otpDigits];
      nextDigits[index - 1] = "";
      setOtpDigits(nextDigits);
      focusOtpInput(index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  }

  function handleOtpPaste(
    event: ClipboardEvent<HTMLInputElement>,
    index: number,
  ) {
    event.preventDefault();
    setOtpValues(event.clipboardData.getData("text"), index);
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setOtpError(undefined);

    if (otpCode.length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || "Something went wrong");
        return;
      }

      if (onVerified) {
        onVerified();
      } else {
        router.push("/");
      }
    } catch {
      setOtpError("Unable to reach the server");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div className="verify-popup-overlay" role="presentation">
      <Card
        className="verify-popup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-popup-title"
      >
        <CardContent className="verify-popup-content">
          <div className="verify-popup-icon" aria-hidden="true">
            ✉️
          </div>
          <h2 id="verify-popup-title" className="verify-popup-title">
            Check your email
          </h2>
          <p className="verify-popup-text">
            We sent a verification link and a 6-digit code to{" "}
            <strong>{email}</strong>.
          </p>

          <form
            className="verify-popup-otp-form"
            onSubmit={handleVerifyCode}
            noValidate
          >
            <div className="verify-popup-code-field">
              <label className="verify-popup-code-label" htmlFor="otp-digit-0">
                Verification code
              </label>
              <div className="verify-popup-code-inputs">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpInputRefs.current[index] = element;
                    }}
                    id={`otp-digit-${index}`}
                    name={`otp-digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    pattern="[0-9]"
                    value={digit}
                    autoFocus={index === 0}
                    aria-label={`Verification code digit ${index + 1}`}
                    onChange={(event) =>
                      setOtpValues(event.target.value, index)
                    }
                    onKeyDown={(event) => handleOtpKeyDown(event, index)}
                    onPaste={(event) => handleOtpPaste(event, index)}
                  />
                ))}
              </div>
              <span className="verify-popup-code-error" aria-live="polite">
                {otpError || "\u00a0"}
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={otpLoading}
            >
              Verify code
            </Button>
          </form>

          <p className="verify-popup-hint">
            Or click the link in the email instead. Didn&apos;t get it?{" "}
            <a href="/signup">Try signing up again</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
