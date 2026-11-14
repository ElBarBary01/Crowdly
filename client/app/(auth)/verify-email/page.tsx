"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "../../components/ui/card/card";
import "./verify-email.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Verification failed");
          return;
        }

        setStatus("success");

        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch {
        setStatus("error");
        setErrorMessage("Unable to reach the server");
      }
    }

    verify();
  }, [token, router]);

  const displayedStatus = token ? status : "error";
  return (
    <div className="verify-email-page">
      <Card className="verify-email-card">
        <CardContent className="verify-email-content">
          {displayedStatus === "verifying" && (
            <>
              <div className="verify-email-spinner" />
              <h1 className="verify-email-title">Verifying your email...</h1>
            </>
          )}

          {displayedStatus === "success" && (
            <>
              <div className="verify-email-icon">✓</div>
              <h1 className="verify-email-title">Email verified!</h1>
              <p className="verify-email-text">Taking you into the app...</p>
            </>
          )}

          {displayedStatus === "error" && (
            <>
              <div className="verify-email-icon verify-email-icon--error">
                ✕
              </div>
              <h1 className="verify-email-title">Verification failed</h1>
              <p className="verify-email-text">
                {token ? errorMessage : "Missing verification token"}
              </p>
              <a href="/signup" className="verify-email-link">
                Back to sign up
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p>Verifying email...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
