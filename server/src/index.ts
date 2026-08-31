import "dotenv/config";
import express, { Request, Response, Application } from "express";
import userRoutes from "./routes/user";
import venueRoutes from "./routes/venue";
import artistRoutes from "./routes/artist";
import eventRoutes from "./routes/event";
import orderRoutes from "./routes/order";
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/payment.routes";
import homeRoutes from "./routes/home";
import { requireAuth } from "./middleware/auth.middleware";
import cookieParser from "cookie-parser";
import cors from "cors";

const app: Application = express();
const PORT = process.env.PORT || 3001;
const clientURL = process.env.FRONTEND_URL || "http://localhost:3000";

// Stripe webhook raw-body middleware
// Stripe's signature verification requires the raw body string.
// This middleware runs only on the webhook path (registered below).
// It captures the raw body so Stripe can verify the HMAC signature.
const stripeRawBodyParser = (
  req: express.Request & { rawBody?: string },
  res: express.Response,
  next: express.NextFunction,
) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => (body += chunk));
  req.on("end", () => {
    req.rawBody = body;
    next();
  });
};

// Global middleware

app.use(express.json());
app.use(
  cors({
    origin: clientURL,
    credentials: true,
  }),
);
app.use(cookieParser());

// Routes

// Webhook must use raw body parser (before express.json consumes the stream)
app.post("/payments/webhook", stripeRawBodyParser, paymentRoutes);

// All other payment endpoints use parsed JSON body
app.use("/payments", paymentRoutes);

// Auth routes (no auth required)
app.use("/auth", authRoutes);

app.use("/home", homeRoutes);
app.use("/venue", venueRoutes);
app.use("/artist", artistRoutes);
app.use("/event", eventRoutes);

app.use(requireAuth);
app.use("/user", userRoutes);
app.use("/order", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
