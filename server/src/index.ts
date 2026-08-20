import express, { Request, Response, Application } from "express";
import userRoutes from "./routes/user";

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/user", userRoutes);

// Type-safe GET route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from typed Express!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
