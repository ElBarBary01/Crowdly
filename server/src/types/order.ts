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

// export type CreateOrderDto = {
//   userId: string;
//   events: OrderEvent[];
//   tickets: OrderTicket[];
//   serviceFee?: number;
//   totalPrice: number;
// };

export type CreateOrderTicketDto = {
  eventId: string;
  type: string;
  quantity: number;
};

export type CreateOrderDto = {
  userId: string;
  tickets: CreateOrderTicketDto[];
  serviceFee?: number;
};

export type UpdateOrderDto = {
  status?: string;
  // serviceFee?: number;
  // totalPrice?: number;
};
