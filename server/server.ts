import './types/express.js';
import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhook } from "./controller/webhooks.js";
import makeAdmin from "./script/makeAdmin.js";
import ProductRouter from "./routes/productsRoutes.js";
import CartRouter from "./routes/cartRoutes.js";
import OrderRouter from "./routes/orderRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";
import wishlistRouter from "./routes/wishlistRouter.js";

const app = express();
app.use(cors());

// Liveness must work even when external services are not configured or available.
app.get("/", (_req: Request, res: Response) => {
  res.send("Server is Live!");
});

// Reuse the MongoDB connection in warm Vercel function instances.
app.use("/api", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch {
    console.error("API database initialization failed. Check MONGODB_URI and database network access.");
    res.status(503).json({ success: false, message: "Database unavailable. Check server configuration." });
  }
});

// The webhook needs its original raw body for signature verification.
app.post("/api/clerk", express.raw({ type: "application/json" }), clerkWebhook);
app.use(express.json());
app.use("/api", clerkMiddleware());
app.use("/api/products", ProductRouter);
app.use("/api/cart", CartRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/addresses", AddressRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/wishlist", wishlistRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Do not expose tokens, connection strings, or raw provider errors.
  console.error("Unhandled API error. Check Clerk configuration and runtime logs.");
  if (res.headersSent) return _next(error);
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ success: false, message: status === 500 ? "Server configuration or request processing failed." : "Invalid request." });
});

// Vercel imports the app; only the local development process opens a port.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));
  // Preserve local admin setup without promoting users on every Vercel cold start.
  void connectDB().then(() => makeAdmin()).catch(() => {
    console.error("Local database initialization failed. Check server environment configuration.");
  });
}

export default app;
