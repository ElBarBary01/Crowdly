import "dotenv/config";
import { createApp } from "./app";
import { startPaymentWorker } from "./service/payment-worker";
import prisma from "./lib/prisma";

const app = createApp();
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
const stopWorker = startPaymentWorker();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await Promise.all([
      new Promise<void>((resolve) => server.close(() => resolve())),
      stopWorker(),
    ]);
    await prisma.$disconnect();
  });
}
