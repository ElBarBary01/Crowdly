import "dotenv/config";
import express, { Request, Response, Application } from "express";
import userRoutes from "./routes/user";
import venueRoutes from "./routes/venue";
import artistRoutes from "./routes/artist";
import eventRoutes from "./routes/event";
import orderRoutes from "./routes/order";
import authRoutes from "./routes/auth.routes";
import { requireAuth } from "./middleware/auth.middleware";
import cookieParser from "cookie-parser";
import cors from "cors";

const app: Application = express();
const PORT = process.env.PORT || 3001;
const clientURL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(express.json());
app.use(
  cors({
    origin: clientURL, //Next.js dev URL
    credentials: true,
  }),
);
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use(requireAuth);

// Routes
app.use("/user", userRoutes);
app.use("/venue", venueRoutes);
app.use("/artist", artistRoutes);
app.use("/event", eventRoutes);
app.use("/order", orderRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from typed Express!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
