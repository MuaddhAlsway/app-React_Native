import assert from "node:assert/strict";
import { Writable } from "node:stream";
import express from "express";
import upload from "../middleware/upload.js";
import { updateProduct } from "../controller/productController.js";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Products.js";
const originalFind = Product.findById;
const originalUpdate = Product.findByIdAndUpdate;
const originalUpload = cloudinary.uploader.upload_stream;
let saved: any; let uploads = 0;
(Product as any).findById = async () => ({ images: ["https://example.test/old.png"] });
(Product as any).findByIdAndUpdate = async (_id: string, updates: any) => { saved = updates; return updates; };
(cloudinary.uploader as any).upload_stream = (_options: unknown, callback: Function) => new Writable({
  write(chunk, _encoding, done) { assert.equal(chunk.toString(), "image-bytes"); uploads++; done(); },
  final(done) { callback(null, { secure_url: "https://example.test/new.png" }); done(); },
});
const app = express();
app.use(express.json());
app.put("/api/products/:id", upload.array("images", 5), updateProduct);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const endpoint = `http://127.0.0.1:${(server.address() as any).port}/api/products/test`;
async function send(retained: string[], count = 0) {
  const form = new FormData(); form.append("existingImages", JSON.stringify(retained));
  form.append("sizes", JSON.stringify(["S", "M"])); form.append("price", "12");
  for (let i = 0; i < count; i++) form.append("images", new Blob(["image-bytes"], { type: "image/png" }), "image.png");
  return fetch(endpoint, { method: "PUT", body: form });
}
try {
  assert.equal((await send(["https://example.test/old.png"])).status, 200);
  assert.deepEqual(saved.images, ["https://example.test/old.png"]);
  assert.deepEqual(saved.sizes, ["S", "M"]); assert.equal(saved.price, 12);
  assert.equal((await send([], 1)).status, 200);
  assert.deepEqual(saved.images, ["https://example.test/new.png"]);
  assert.equal((await send(["https://example.test/old.png"], 1)).status, 200);
  assert.deepEqual(saved.images, ["https://example.test/old.png", "https://example.test/new.png"]);
  const previousUploads = uploads;
  assert.equal((await send([])).status, 400);
  assert.equal((await send(["https://example.test/old.png"], 5)).status, 400);
  assert.equal((await send(["https://example.test/foreign.png"])).status, 400);
  assert.equal(uploads, previousUploads);
  console.log("PASS: edit preserves/replaces/adds images, parses sizes and price, rejects zero/six images and foreign retained URLs before upload. Real Express/Multer/controller; Cloudinary/database mocked, auth not exercised.");
} finally {
  Product.findById = originalFind; Product.findByIdAndUpdate = originalUpdate;
  cloudinary.uploader.upload_stream = originalUpload; server.close();
}
