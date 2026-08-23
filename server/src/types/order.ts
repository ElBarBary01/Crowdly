export type OrderTicket = { type: string; price: number; quantity: number };
export type OrderEvent = { id: string; title: string; date: string; time: string; venueId: string; venueName: string };

export type Order = {
  id: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  status: string;
  serviceFee: number;
  events: OrderEvent[];
  tickets: OrderTicket[];
  totalPrice: number;
};

export type CreateOrderDto = {
  userId: string;
  events: OrderEvent[];
  tickets: OrderTicket[];
  serviceFee?: number;
  totalPrice: number;
};

export type UpdateOrderDto = {
  status?: string;
  serviceFee?: number;
  totalPrice?: number;
};