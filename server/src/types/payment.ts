import type { PaymentMethod } from "./order";
export type * from "./order";
export type { TicketReservation as Reservation } from "../../generated/prisma/client";
export type CreatePaymentCheckoutDto = {
  orderId: string;
  method?: PaymentMethod;
};
export type CreateRefundDto = {
  paymentAttemptId: string;
  requestId: string;
  amount?: number;
  restockTickets?: boolean;
};
