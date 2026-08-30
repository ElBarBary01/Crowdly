import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";
import { colors, fonts, gradient } from "./styles";

export interface ResetPasswordProps {
  resetUrl: string;
  manageUrl: string;
  unsubscribeUrl?: string;
}

export const ResetPassword = ({
  resetUrl,
  manageUrl,
  unsubscribeUrl,
}: ResetPasswordProps) => (
  <EmailLayout
    previewText="Reset your Crowdly password"
    footerNote="You are receiving this email because you signed up for Crowdly updates."
    manageUrl={manageUrl}
    unsubscribeUrl={unsubscribeUrl}
  >
    <Text style={heading}>Reset your password</Text>
    <Text style={bodyText}>
      We received a request to reset the password associated with your Crowdly
      account. Click the button below to choose a new secure password.
    </Text>

    <Section style={{ textAlign: "center" as const }}>
      <Button href={resetUrl} style={button}>
        Reset Password
      </Button>
    </Section>
    <Text style={expiryText}>
      This link is single-use and expires in exactly 1 hour.
    </Text>

    <Section style={divider}>
      <Text style={securityText}>
        <span style={{ fontWeight: 700, color: "#B0B0BE" }}>
          Didn&apos;t request this?{" "}
        </span>
        If you didn&apos;t initiate this change, don&apos;t worry. Your password
        hasn&apos;t been changed yet, and your account remains safe. We
        recommend reviewing your security settings if you suspect unauthorized
        access.
      </Text>
    </Section>
  </EmailLayout>
);

export default ResetPassword;

ResetPassword.PreviewProps = {
  resetUrl: "https://crowdly.com/reset?token=abc123",
  manageUrl: "https://crowdly.com/preferences",
  unsubscribeUrl: "https://crowdly.com/unsubscribe",
} satisfies ResetPasswordProps;

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
  fontSize: "14px",
  lineHeight: "24px",
  color: colors.body,
  margin: 0,
};
