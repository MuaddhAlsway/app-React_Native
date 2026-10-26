import assert from "node:assert/strict";
import { Writable } from "node:stream";
import express from "express";
import upload from "../middleware/upload.js";
import { createProduct } from "../controller/productController.js";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Products.js";
const helperPath = "../../client/utils/productImages.ts";
const { appendProductImages } = await import(helperPath);

const bytes = Buffer.from("test-image-bytes");
const received: Buffer[] = [];
const originalUpload = cloudinary.uploader.upload_stream;
const originalCreate = Product.create;
(cloudinary.uploader as any).upload_stream = (_options: unknown, callback: Function) => new Writable({
  write(chunk, _encoding, done) { received.push(Buffer.from(chunk)); done(); },
  final(done) { callback(null, { secure_url: "https://example.test/image.png" }); done(); },
});
(Product as any).create = async (data: unknown) => data;
const app = express();
app.use(express.json());
app.post("/api/products", upload.array("images", 5), createProduct);
app.use((error: any, _req: any, res: any, _next: any) => res.status(400).json({ code: error.code }));
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const endpoint = `http://127.0.0.1:${(server.address() as any).port}/api/products`;
try {
  const asset = { uri: "blob:selected", width: 1, height: 1, mimeType: "image/png", file: new File([bytes], "selected.png", { type: "image/png" }) };
  const broken = new FormData();
  broken.append("name", "Test");
  broken.append("images", { uri: asset.uri, name: "selected.png", type: "image/png" } as any);
  assert.equal((await fetch(endpoint, { method: "POST", body: broken })).status, 400);
  for (const count of [1, 5]) {
    const form = new FormData(); form.append("name", "Test");
    await appendProductImages(form, Array(count).fill(asset), "web");
    const response = await fetch(endpoint, { method: "POST", body: form });
    assert.equal(response.status, 201, await response.text());
  }
  assert.equal(received.length, 6);
  received.forEach(buffer => assert.deepEqual(buffer, bytes));
  const fallback = new FormData();
  await appendProductImages(fallback, [{ uri: "data:image/png;base64," + bytes.toString("base64"), width: 1, height: 1 }], "web");
  assert.equal((await fetch(endpoint, { method: "POST", body: fallback })).status, 201);
  const nativeParts: any[] = [];
  await appendProductImages({ append: (...args: any[]) => nativeParts.push(args) } as any, [{ uri: "file:///image.png", width: 1, height: 1, mimeType: "image/png" }], "android");
  assert.deepEqual(nativeParts[0], ["images", { uri: "file:///image.png", name: "image.png", type: "image/png" }]);
  const tooMany = new FormData();
  for (let i = 0; i < 6; i++) tooMany.append("images", asset.file);
  assert.equal((await fetch(endpoint, { method: "POST", body: tooMany })).status, 400);
  (cloudinary.uploader as any).upload_stream = (_options: unknown, callback: Function) => new Writable({
    write(_chunk, _encoding, done) { done(); },
    final(done) { callback({ message: "Request forbidden due to missing permissions (actions=[create])", http_code: 403 }); done(); },
  });
  const rejected = new FormData();
  await appendProductImages(rejected, [asset], "web");
  const failure = await fetch(endpoint, { method: "POST", body: rejected });
  assert.equal(failure.status, 502);
  assert.match((await failure.json()).message, /Image upload failed:.*missing permissions/);
  (cloudinary.uploader as any).upload_stream = (_options: unknown, callback: Function) => new Writable({
    write(_chunk, _encoding, done) { done(); },
    final(done) { callback(null, { secure_url: "https://example.test/image.png" }); done(); },
  });
  (Product as any).create = async () => { throw { message: "Database rejected product" }; };
  const dbForm = new FormData();
  await appendProductImages(dbForm, [asset], "web");
  const dbFailure = await fetch(endpoint, { method: "POST", body: dbForm });
  assert.equal(dbFailure.status, 500);
  const dbBody = await dbFailure.json();
  assert.equal(dbBody.code, "PRODUCT_SAVE_FAILED");
  assert.match(dbBody.message, /Database rejected product/);
  console.log("PASS: database plain-object failures retain their cause and stage.");
  console.log("PASS: plain-object Cloudinary errors retain their message instead of the generic product failure.");  console.log("PASS: original 400 reproduced; web File and URI Blob reach Multer and Cloudinary stream buffers; 1/5 accepted, 6 rejected; Android descriptor verified. Cloudinary and DB mocked; authentication not exercised.");
} finally {
  cloudinary.uploader.upload_stream = originalUpload;
  Product.create = originalCreate;
  server.close();
}
