import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { colors, fonts, gradient } from "./styles";

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
  footerNote: string;
  manageUrl: string;
  unsubscribeUrl?: string;
}

export const EmailLayout = ({
  previewText,
  children,
  footerNote,
  manageUrl,
  unsubscribeUrl,
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header / Logo */}
          <Section style={header}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              align="center"
              style={{ margin: "0 auto" }}
            >
              <tbody>
                <tr>
                  <td style={logoIconCell}>
                    <span style={logoIconText}>C</span>
                  </td>
                  <td style={logoTextCell}>Crowdly</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Card content — supplied by each email */}
          <Section style={card}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>{footerNote}</Text>
            <Text style={footerText}>
              Crowdly, Inc. &middot; Podium1, 304 Cairo festival City&middot;
              Cairo, Egypt
            </Text>
            <Text style={footerLinks}>
              <a href={manageUrl} style={linkStyle}>
                Manage Preferences
              </a>
              {unsubscribeUrl && (
                <>
                  <span style={{ color: colors.muted }}> &middot; </span>
                  <a href={unsubscribeUrl} style={linkStyle}>
                    Unsubscribe
                  </a>
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: colors.bg,
  fontFamily: fonts.body,
  margin: 0,
  padding: 0,
};
const container = {
  width: "600px",
  maxWidth: "100%",
  margin: "0 auto",
  padding: "24px",
};
const header = { padding: "32px 0 24px 0", textAlign: "center" as const };

const logoIconCell = {
  width: "28px",
  height: "28px",
  background: gradient,
  borderRadius: "8px",
  textAlign: "center" as const,
  verticalAlign: "middle" as const,
};
const logoIconText = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "14px",
  color: colors.heading,
};
const logoTextCell = {
  paddingLeft: "8px",
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "18px",
  letterSpacing: "-0.5px",
  color: colors.heading,
  verticalAlign: "middle" as const,
};

const card = {
  backgroundColor: colors.card,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: "16px",
  padding: "32px",
};

const footer = {
  borderTop: `1px solid ${colors.cardBorder}`,
  padding: "32px 0 40px 0",
  textAlign: "center" as const,
};
const footerText = {
  fontFamily: fonts.body,
  fontSize: "12px",
  lineHeight: "18px",
  color: colors.muted,
  margin: "0 0 8px 0",
  textAlign: "center" as const,
};
const footerLinks = { fontSize: "12px", margin: 0 };
const linkStyle = {
  fontFamily: fonts.body,
  fontSize: "12px",
  color: "#8A8A9A",
  textDecoration: "underline",
};
