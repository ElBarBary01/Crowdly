"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/card/card";

import "../login/login.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined,
  );

  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >(undefined);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");

    if (resetToken) {
      setToken(resetToken);
    }
  }, []);

  function validate() {
    let valid = true;

    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Must be at least 8 characters");
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      valid = false;
    } else {
      setConfirmPasswordError(undefined);
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setFormError(null);
    setSuccessMessage(null);

    if (!token) {
      setFormError("Invalid or missing reset link");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Unable to reset password");
        return;
      }

      setSuccessMessage(
        data.message || "Your password has been reset successfully.",
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
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

          <h1 className="login-title">Reset Password</h1>

          <p className="login-subtitle">Enter your new password below.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-slot">
              <InputField
                label="New Password"
                type="password"
                name="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);

                  if (passwordError) {
                    setPasswordError(undefined);
                  }

                  if (formError) {
                    setFormError(null);
                  }
                }}
                error={passwordError}
              />
            </div>

            <div className="login-field-slot">
              <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);

                  if (confirmPasswordError) {
                    setConfirmPasswordError(undefined);
                  }

                  if (formError) {
                    setFormError(null);
                  }
                }}
                error={confirmPasswordError}
              />
            </div>

            {formError && <p className="login-error">{formError}</p>}

            {successMessage && (
              <p className="login-success">{successMessage}</p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Reset Password
            </Button>
          </form>

          <p className="login-signup">
            <a href="/login">Back to Sign In</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
