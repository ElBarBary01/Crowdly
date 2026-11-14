export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}
export class WebhookSignatureError extends PaymentError {
  constructor() {
    super("Invalid webhook signature");
    this.name = "WebhookSignatureError";
  }
}
