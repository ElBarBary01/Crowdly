import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";
import { colors, fonts, gradient } from "./styles";

export interface LineItem {
  label: string;
  price: string;
}

export interface TicketConfirmationProps {
  orderId: string;
  orderDate: string;
  event: {
    imageUrl: string;
    title: string;
    datetime: string;
    venue: string;
  };
  seat: {
    section: string;
    row: string;
    seats: string;
    quantity: string;
  };
  qrCodeUrl: string;
  lineItems: LineItem[];
  paymentMethod: string;
  totalPaid: string;
  viewTicketsUrl: string;
  appleWalletUrl: string;
  pdfUrl: string;
  manageUrl: string;
  unsubscribeUrl?: string;
}

export const TicketConfirmation = ({
  orderId,
  orderDate,
  event,
  seat,
  qrCodeUrl,
  lineItems,
  paymentMethod,
  totalPaid,
  viewTicketsUrl,
  appleWalletUrl,
  pdfUrl,
  manageUrl,
  unsubscribeUrl,
}: TicketConfirmationProps) => (
  <EmailLayout
    previewText={`Your tickets for ${event.title} are confirmed`}
    footerNote="For receipt and ticketing inquiries, contact help@crowdly.com directly."
    manageUrl={manageUrl}
    unsubscribeUrl={unsubscribeUrl}
  >
    <Section style={{ textAlign: "center" as const, marginBottom: "16px" }}>
      <span style={checkCircle}>&#10003;</span>
    </Section>
    <Text style={heading}>Your tickets are confirmed!</Text>
    <Text style={orderMeta}>
      Order #{orderId} &middot; {orderDate}
    </Text>

    <Section style={divider}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td width={90} valign="top">
              <Img
                src={event.imageUrl}
                width="90"
                height="90"
                alt={event.title}
                style={{ borderRadius: "12px", objectFit: "cover" as const }}
              />
            </td>
            <td valign="top" style={{ paddingLeft: "16px" }}>
              <Text style={eventTitle}>{event.title}</Text>
              <Text style={eventMeta}>&#128197;&nbsp; {event.datetime}</Text>
              <Text style={{ ...eventMeta, margin: 0 }}>
                &#128205;&nbsp; {event.venue}
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section style={seatBox}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td width="25%" style={seatLabel}>
              Section
            </td>
            <td width="25%" style={seatLabel}>
              Row
            </td>
            <td width="25%" style={seatLabel}>
              Seats
            </td>
            <td width="25%" style={seatLabel}>
              Quantity
            </td>
          </tr>
          <tr>
            <td width="25%" style={seatValue}>
              {seat.section}
            </td>
            <td width="25%" style={seatValue}>
              {seat.row}
            </td>
            <td width="25%" style={seatValue}>
              {seat.seats}
            </td>
            <td width="25%" style={seatValue}>
              {seat.quantity}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section style={qrBox}>
      <Img
        src={qrCodeUrl}
        width="180"
        height="180"
        alt="Ticket QR code"
        style={{
          backgroundColor: colors.white,
          borderRadius: "12px",
          padding: "12px",
        }}
      />
      <Text style={qrCaption}>
        Scan this code at the venue gate for instant admission.
      </Text>
    </Section>

    <Section>
      <Text style={receiptLabel}>Payment Receipt</Text>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i}>
              <td style={lineLabel}>{item.label}</td>
              <td align="right" style={lineValue}>
                {item.price}
              </td>
            </tr>
          ))}
          <tr>
            <td
              colSpan={2}
              style={{
                borderTop: `1px solid ${colors.cardBorder}`,
                paddingTop: "12px",
              }}
            />
          </tr>
          <tr>
            <td style={totalLabel}>Total Paid (Charged to {paymentMethod})</td>
            <td align="right" style={totalValue}>
              {totalPaid}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section style={{ marginTop: "24px" }}>
      <Button href={viewTicketsUrl} style={ctaButton}>
        View My Tickets
      </Button>
    </Section>

    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ marginTop: "12px" }}
    >
      <tbody>
        <tr>
          <td width="48%" style={secondaryButtonCell}>
            <a
              href={appleWalletUrl}
              target="_blank"
              rel="noreferrer"
              style={secondaryButtonLink}
            >
              Add to Apple Wallet
            </a>
          </td>
          <td width="4%" />
          <td width="48%" style={secondaryButtonCell}>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={secondaryButtonLink}
            >
              Download PDF Tickets
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </EmailLayout>
);

export default TicketConfirmation;

TicketConfirmation.PreviewProps = {
  orderId: "ORD-88421",
  orderDate: "September 12, 2026",
  event: {
    imageUrl: "https://picsum.photos/seed/weeknd/200/200",
    title: "The Weeknd — After Hours",
    datetime: "Sat, Sep 12, 2026 · 8:00 PM",
    venue: "SoFi Stadium · Los Angeles, CA",
  },
  seat: {
    section: "Loge 104",
    row: "18",
    seats: "12 - 13",
    quantity: "2 Tickets",
  },
  qrCodeUrl:
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ORD-88421",
  lineItems: [
    { label: "2x General Admission ($55.00 ea)", price: "$110.00" },
    { label: "Service Fees", price: "$18.00" },
    { label: "Processing & Delivery", price: "$10.00" },
  ],
  paymentMethod: "Mastercard •••• 9012",
  totalPaid: "$138.00",
  viewTicketsUrl: "https://crowdly.com/orders/ORD-88421",
  appleWalletUrl: "https://crowdly.com/wallet/ORD-88421",
  pdfUrl: "https://crowdly.com/orders/ORD-88421/pdf",
  manageUrl: "https://crowdly.com/preferences",
  unsubscribeUrl: "https://crowdly.com/unsubscribe",
} satisfies TicketConfirmationProps;

const checkCircle = {
  display: "inline-block",
  width: "64px",
  height: "64px",
  lineHeight: "64px",
  backgroundColor: "rgba(34,197,94,0.15)",
  border: "1px solid rgba(34,197,94,0.3)",
  borderRadius: "32px",
  fontSize: "26px",
  color: colors.success,
};
const heading = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "24px",
  lineHeight: "32px",
  color: colors.heading,
  margin: "0 0 8px 0",
  textAlign: "center" as const,
};
const orderMeta = {
  fontFamily: fonts.mono,
  fontSize: "13px",
  color: colors.muted,
  margin: "0 0 24px 0",
  textAlign: "center" as const,
};
const divider = {
  borderTop: `1px solid ${colors.cardBorder}`,
  paddingTop: "24px",
  marginBottom: "24px",
};
const eventTitle = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "19px",
  lineHeight: "24px",
  color: colors.heading,
  margin: "0 0 8px 0",
};
const eventMeta = {
  fontFamily: fonts.body,
  fontSize: "14px",
  lineHeight: "20px",
  color: colors.body,
  margin: "0 0 4px 0",
};
const seatBox = {
  backgroundColor: colors.subtleBg,
  border: `1px solid ${colors.subtleBorder}`,
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "24px",
};
const seatLabel = {
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.5px",
  color: colors.muted,
  textTransform: "uppercase" as const,
  paddingBottom: "6px",
};
const seatValue = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "16px",
  color: colors.heading,
};
const qrBox = {
  backgroundColor: colors.subtleBg,
  border: `1px solid ${colors.subtleBorder}`,
  borderRadius: "12px",
  padding: "32px",
  textAlign: "center" as const,
  marginBottom: "24px",
};
const qrCaption = {
  fontFamily: fonts.body,
  fontSize: "13px",
  lineHeight: "18px",
  color: colors.body,
  margin: "16px 0 0 0",
};
const receiptLabel = {
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.5px",
  color: colors.muted,
  textTransform: "uppercase" as const,
  margin: "0 0 12px 0",
};
const lineLabel = {
  fontFamily: fonts.body,
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.body,
  padding: "0 0 6px 0",
};
const lineValue = {
  fontFamily: fonts.body,
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.heading,
  padding: "0 0 6px 0",
};
const totalLabel = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "15px",
  color: colors.heading,
  paddingTop: "12px",
};
const totalValue = {
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "18px",
  color: colors.accent,
  paddingTop: "12px",
};
const ctaButton = {
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
  padding: "14px 32px",
  textDecoration: "none",
};
const secondaryButtonCell = {
  backgroundColor: colors.subtleBg,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: "8px",
  textAlign: "center" as const,
};
const secondaryButtonLink = {
  display: "block",
  padding: "12px 8px",
  fontFamily: fonts.heading,
  fontWeight: 700,
  fontSize: "13px",
  color: colors.heading,
  textDecoration: "none",
};
