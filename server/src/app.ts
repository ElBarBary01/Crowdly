import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user";
import venueRoutes from "./routes/venue";
import artistRoutes from "./routes/artist";
import eventRoutes from "./routes/event";
import orderRoutes from "./routes/order";
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/payment.routes";
import homeRoutes from "./routes/home";
import { webhookHandler } from "./controllers/payment.controller";
import { requireAuth } from "./middleware/auth.middleware";

export function createApp() {
  const app = express();
  const clientURL = process.env.FRONTEND_URL || "http://localhost:3000";

  // Signature verification needs the original bytes, before JSON parsing.
  app.post(
    "/payments/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    webhookHandler,
  );

  app.use(express.json());
  app.use(cors({ origin: clientURL, credentials: true }));
  app.use(cookieParser());

  app.use("/payments", paymentRoutes);
  app.use("/auth", authRoutes);
  app.use("/home", homeRoutes);
  app.use("/venue", venueRoutes);
  app.use("/artist", artistRoutes);
  app.use("/event", eventRoutes);

  app.use(requireAuth);
  app.use("/user", userRoutes);
  app.use("/order", orderRoutes);

  return app;
}
