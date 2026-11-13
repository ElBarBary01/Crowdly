export type PaymentStatus =
  "NOT_STARTED" | "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";

export type PaymentProvider = "STRIPE";

export type PaymentMethod = "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "PAYPAL";

export type PaymentAttempt = {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  providerReference: string;
  providerSessionId?: string;
  paymentIntentId?: string;
  method?: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OrderTicket = {
  eventId: string;
  type: string;
  price: number;
  quantity: number;
};

export type OrderEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  venueId: string;
  venueName: string;
};

export type Order = {
  id: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  status: string;
  paymentStatus: PaymentStatus;
  serviceFee: number;
  events: OrderEvent[];
  tickets: OrderTicket[];
  totalPrice: number;
  paymentAttempts: PaymentAttempt[];
};

export type CreateOrderTicketDto = {
  type: string;
  quantity: number;
};

export type CreateOrderDto = {
  userId: string;
  eventId: string;
  tickets: CreateOrderTicketDto[];
};

export type UpdateOrderDto = {
  status?: string;
};

// Payment module types (defined here to keep the types file self-contained)

// Input expected from the frontend on POST /payments/create
export type CreatePaymentCheckoutDto = {
  orderId: string;
  method?: PaymentMethod;
};

// Input expected from the admin frontend on POST /payments/refund
export type CreateRefundDto = {
  paymentAttemptId: string;
  amount?: number; // optional: partial refund; omit for full refund
};

// Use the persisted reservation model, including its deadline and state.
export type { TicketReservation as Reservation } from "../../generated/prisma/client";
