import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";
import { colors, fonts, gradient } from "./styles";

export interface VerifyEmailProps {
  code: string;
  verifyUrl: string;
  manageUrl: string;
  unsubscribeUrl?: string;
}

export const VerifyEmail = ({
  code,
  verifyUrl,
  manageUrl,
  unsubscribeUrl,
}: VerifyEmailProps) => (
  <EmailLayout
    previewText={`Your Crowdly verification code is ${code}`}
    footerNote="You are receiving this email because you signed up for Crowdly updates."
    manageUrl={manageUrl}
    unsubscribeUrl={unsubscribeUrl}
  >
    <Text style={heading}>Verify your email address</Text>
    <Text style={bodyText}>
      Welcome to Crowdly! Before we get started discovering the hottest shows
      and live music near you, please enter the verification code below on our
      site or verify directly.
    </Text>

    <Section style={codeBox}>
      <Text style={codeText}>{code}</Text>
      <Text style={codeLabel}>Verification Code</Text>
    </Section>

    <Section style={{ textAlign: "center" as const }}>
      <Button href={verifyUrl} style={button}>
        Verify Email
      </Button>
      <Text style={expiryText}>
        This code and link will expire in 10 minutes.
      </Text>
    </Section>

    <Section style={divider}>
      <Text style={securityText}>
        If you did not register for a Crowdly account, you can safely ignore
        this email. Your information remains secure.
      </Text>
    </Section>
  </EmailLayout>
);

export default VerifyEmail;

// Sample data shown when you run the local preview server
VerifyEmail.PreviewProps = {
  code: "748931",
  verifyUrl: "https://crowdly.com/verify?code=748931",
  manageUrl: "https://crowdly.com/preferences",
  unsubscribeUrl: "https://crowdly.com/unsubscribe",
} satisfies VerifyEmailProps;

const heading = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "24px",
  lineHeight: "32px",
  color: colors.heading,
  margin: "0 0 8px 0",
};
const bodyText = {
  fontFamily: fonts.body,
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.body,
  margin: "0 0 24px 0",
};
const codeBox = {
  backgroundColor: colors.subtleBg,
  border: `1px solid ${colors.subtleBorder}`,
  borderRadius: "12px",
  padding: "24px",
  textAlign: "center" as const,
  marginBottom: "24px",
};
const codeText = {
  fontFamily: fonts.mono,
  fontWeight: 700,
  fontSize: "36px",
  lineHeight: "48px",
  letterSpacing: "8px",
  color: colors.accent,
  margin: "0 0 8px 0",
};
const codeLabel = {
  fontFamily: fonts.body,
  fontSize: "12px",
  color: colors.muted,
  margin: 0,
};
const button = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  background: gradient,
  borderRadius: "8px",
  color: colors.white,
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "14px",
  textAlign: "center" as const,
  padding: "12px 32px",
  textDecoration: "none",
};
const expiryText = {
  fontFamily: fonts.body,
  fontSize: "12px",
  color: colors.muted,
  margin: "16px 0 0 0",
  textAlign: "center" as const,
};
const divider = {
  borderTop: `1px solid ${colors.cardBorder}`,
  paddingTop: "24px",
  marginTop: "24px",
};
const securityText = {
  fontFamily: fonts.body,
  fontSize: "12px",
  lineHeight: "18px",
  color: colors.muted,
  margin: 0,
};
