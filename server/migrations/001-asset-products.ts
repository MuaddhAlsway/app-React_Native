import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import Product from "../models/Products.js";

// Resolve configuration and snapshot relative to this script, not the shell cwd.
config({ path: new URL("../.env", import.meta.url), quiet: true });
const apply = process.argv.includes("--apply");
try {
  const rows = JSON.parse(await readFile(new URL("./data/asset-products.json", import.meta.url), "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty product snapshot.");
  const seen = new Set<string>();
  const documents = await Promise.all(rows.map(async (row) => {
    if (!/^[a-f0-9]{24}$/i.test(row._id) || seen.has(row._id)) throw new Error("Invalid or duplicate asset ID.");
    seen.add(row._id);
    if (!row.name?.trim() || !row.description?.trim() || !Array.isArray(row.sizes) || row.sizes.length === 0 || row.sizes.some((s: unknown) => typeof s !== "string" || !s.trim())) throw new Error(`Missing title, description, or sizes: ${row._id}`);
    if (!Array.isArray(row.images) || row.images.length < 1 || row.images.length > 5 || row.images.some((s: unknown) => typeof s !== "string" || !/^https?:\/\//.test(s))) throw new Error(`Invalid image URLs: ${row._id}`);
    const document = new Product({
      _id: row._id, name: row.name, description: row.description,
      price: row.price, images: row.images, sizes: row.sizes,
      category: row.category, stock: row.stock,
      isFeatured: row.isFeatured, isActive: row.isActive,
      createdAt: new Date(row.createdAt), updatedAt: new Date(row.createdAt),
    });
    await document.validate();
    return document.toObject();
  }));
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const ids = documents.map(d => d._id);
  const before = await Product.countDocuments();
  const existing = await Product.find({ _id: { $in: ids } }).lean();
  // Existing IDs are never overwritten. Refuse conflicting data rather than silently skipping it.
  const fields = ["name", "description", "price", "images", "sizes", "category", "stock", "isFeatured", "isActive"] as const;
  const source = new Map(documents.map(d => [String(d._id), d]));
  for (const item of existing) {
    const expected = source.get(String(item._id))!;
    if (fields.some(field => JSON.stringify(item[field]) !== JSON.stringify(expected[field]))) throw new Error(`Existing product conflicts with snapshot: ${item._id}. No products were written.`);
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", sourceProducts: documents.length, existingMatches: existing.length, toInsert: documents.length - existing.length, totalBefore: before }));
  if (apply) {
    const result = await Product.bulkWrite(documents.map(document => ({ updateOne: {
      filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true, timestamps: false,
    } })), { ordered: true });
    const saved = await Product.find({ _id: { $in: ids } }).lean();
    if (saved.length !== documents.length) throw new Error("Post-migration count mismatch.");
    for (const item of saved) {
      const expected = source.get(String(item._id))!;
      if (fields.some(field => JSON.stringify(item[field]) !== JSON.stringify(expected[field]))) throw new Error(`Verification mismatch: ${item._id}`);
    }
    console.log(JSON.stringify({ inserted: result.upsertedCount, verifiedProducts: saved.length, totalAfter: await Product.countDocuments(), verifiedFields: fields, imageStorage: "Original source URLs; no Cloudinary re-upload" }));
  }
} catch (error) {
  // Never print connection strings or raw driver errors which may contain credentials.
  const message = error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[REDACTED_URI]") : "Migration failed.";
  console.error(message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
