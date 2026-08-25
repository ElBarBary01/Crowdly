"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/card/card";
import VerifyPopup from "../components/ui/VerifyPopup";
import "./signup.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [firstNameError, setFirstNameError] = useState<string | undefined>(
    undefined,
  );
  const [lastNameError, setLastNameError] = useState<string | undefined>(
    undefined,
  );
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined,
  );
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >(undefined);
  const [agreedError, setAgreedError] = useState<string | undefined>(undefined);

  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  function validate() {
    let valid = true;

    if (!firstName) {
      setFirstNameError("First name is required");
      valid = false;
    } else {
      setFirstNameError(undefined);
    }

    if (!lastName) {
      setLastNameError("Last name is required");
      valid = false;
    } else {
      setLastNameError(undefined);
    }

    if (!email) {
      setEmailError("Email is required");
      valid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    } else {
      setEmailError(undefined);
    }

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

    if (!agreed) {
      setAgreedError("You must agree to continue");
      valid = false;
    } else {
      setAgreedError(undefined);
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Something went wrong");
        return;
      }

      setRegisteredEmail(email);
      setShowVerifyPopup(true);
    } catch {
      setFormError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      {showVerifyPopup && <VerifyPopup email={registeredEmail} />}

      <Card className="signup-card">
        <CardContent className="signup-card-content">
          <div className="signup-brand">
            <span className="signup-brand__mark">C</span>
            <span className="signup-brand__name">Crowdly</span>
          </div>

          <h1 className="signup-title">Create account</h1>
          <p className="signup-subtitle">Join fans on Crowdly</p>

          <Button
            variant="secondary"
            size="md"
            className="signup-google-btn"
            leftIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <div className="signup-divider">
            <span>or continue with email</span>
          </div>

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="signup-name-row">
              <div className="signup-field-slot">
                <InputField
                  label="First name"
                  type="text"
                  name="firstName"
                  placeholder="Alex"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (firstNameError) setFirstNameError(undefined);
                  }}
                  error={firstNameError}
                />
              </div>

              <div className="signup-field-slot">
                <InputField
                  label="Last name"
                  type="text"
                  name="lastName"
                  placeholder="Rivera"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (lastNameError) setLastNameError(undefined);
                  }}
                  error={lastNameError}
                />
              </div>
            </div>

            <div className="signup-field-slot">
              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(undefined);
                }}
                error={emailError}
              />
            </div>

            <div className="signup-field-slot">
              <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
                error={passwordError}
              />
            </div>

            <div className="signup-field-slot">
              <InputField
                label="Confirm password"
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(undefined);
                }}
                error={confirmPasswordError}
              />
            </div>

            <div className="signup-terms">
              <label className="signup-terms__row">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (agreedError) setAgreedError(undefined);
                  }}
                />
                <span>
                  I agree to the <a href="/terms">Terms of Service</a> and{" "}
                  <a href="/privacy">Privacy Policy</a>
                </span>
              </label>
              {agreedError && (
                <p className="signup-terms__error">{agreedError}</p>
              )}
            </div>

            {formError && <p className="signup-error">{formError}</p>}

            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Create Account
            </Button>
          </form>

          <p className="signup-signin">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
