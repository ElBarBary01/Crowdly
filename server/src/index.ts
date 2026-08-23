import "dotenv/config";
import express, { Request, Response, Application } from "express";
import userRoutes from "./routes/user";
import authRoutes from "./routes/auth.routes";
import { requireAuth } from "./middleware/auth.middleware";

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/auth", authRoutes);
app.use(requireAuth);

app.use("/user", userRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from typed Express!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
