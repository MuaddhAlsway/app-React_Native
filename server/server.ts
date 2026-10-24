import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import { clerkWebhook } from "./controller/webhooks.js";
import makeAdmin from "./script/makeAdmin.js";
import ProductRouter from "./routes/productsRoutes.js";

import CartRouter from "./routes/cartRoutes.js";
import OrderRouter from "./routes/orderRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";
import wishlistRouter from "./routes/wishlistRouter.js";

const app = express();


app.post('/api/clerk', express.raw({type: "application/json"}), clerkWebhook);
// CONNECT TO MONGODB
await connectDB();

// Middleware
app.use(cors())
app.use(express.json());
app.use(clerkMiddleware())

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use("/api/products", ProductRouter)
app.use("/api/cart", CartRouter)
app.use("/api/orders", OrderRouter)
app.use("/api/addresses", AddressRouter)
app.use("/api/admin", AdminRouter)
app.use('/api/wishlist', wishlistRouter)
await makeAdmin()
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});