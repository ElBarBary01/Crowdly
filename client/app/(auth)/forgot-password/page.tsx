"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/card/card";

import "../login/login.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    let valid = true;

    if (!email) {
      setEmailError("Email is required");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    } else {
      setEmailError(undefined);
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setFormError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Something went wrong");
        return;
      }

      setSuccessMessage(
        data.message ||
          "If an account exists with this email, a reset link has been sent.",
      );
    } catch {
      setFormError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <CardContent className="login-card-content">
          <div className="login-brand">
            <span className="login-brand__mark">C</span>
            <span className="login-brand__name">Crowdly</span>
          </div>

          <h1 className="login-title">Forgot Password</h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-slot">
              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  if (emailError) {
                    setEmailError(undefined);
                  }

                  if (formError) {
                    setFormError(null);
                  }

                  if (successMessage) {
                    setSuccessMessage(null);
                  }
                }}
                error={emailError}
              />
            </div>

            {formError && <p className="login-error">{formError}</p>}

            {successMessage && (
              <p className="login-success">{successMessage}</p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Send Reset Link
            </Button>
          </form>

          <p className="login-signup">
            Remember your password? <a href="/login">Sign In</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
