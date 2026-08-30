import { Resend } from "resend";

import ResetPassword from "../templates/reset-password";
import { ResetPasswordProps } from "../templates/reset-password";
import VerifyEmail from "../templates/verify-email";
import { VerifyEmailProps } from "../templates/verify-email";
import TicketConfirmation from "../templates/ticket-confirmation";
import {
  TicketConfirmationProps,
  LineItem,
} from "../templates/ticket-confirmation";

interface orderDetails {
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
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerifyEmail = async ({
  email,
  code,
  verifyUrl,
  manageUrl,
  unsubscribeUrl,
}: { email: string } & VerifyEmailProps) => {
  return await resend.emails.send({
    from: "Verification <verification@resume.barbary.app>",
    to: email,
    subject: "Verify your email address",
    react: VerifyEmail({ code, verifyUrl, manageUrl, unsubscribeUrl }),
  });
};

export const sendResetPasswordEmail = async ({
  email,
  resetUrl,
  manageUrl,
}: { email: string } & ResetPasswordProps) => {
  return await resend.emails.send({
    from: "Password Reset <password-reset@resume.barbary.app>",
    to: email,
    subject: "Reset your password",
    react: ResetPassword({ resetUrl, manageUrl }),
  });
};

export const sendTicketConfirmationEmail = async ({
  email,
  ticketDetails,
  manageUrl,
  unsubscribeUrl,
}: {
  email: string;
  ticketDetails: orderDetails;
} & TicketConfirmationProps) => {
  return await resend.emails.send({
    from: "Ticket Confirmation <tickets@resume.barbary.app>",
    to: email,
    subject: "Your ticket confirmation",
    react: TicketConfirmation({
      ...ticketDetails,
      manageUrl,
      unsubscribeUrl,
    }),
  });
};
