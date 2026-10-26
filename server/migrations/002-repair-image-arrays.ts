import { config } from "dotenv";
import mongoose from "mongoose";
config({ path: new URL("../.env", import.meta.url), quiet: true });
const apply = process.argv.includes("--apply");
function decode(value: unknown, depth = 0): string[] {
  if (depth > 8) throw new Error("Excessively nested image data.");
  if (Array.isArray(value)) return value.flatMap(item => decode(item, depth + 1));
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) return [value];
    if (value.trim().startsWith("[")) return decode(JSON.parse(value), depth + 1);
  }
  throw new Error("Unrecognized image data; refusing to discard it.");
}
try {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const collection = mongoose.connection.collection("products");
  const rows = await collection.find({ images: { $elemMatch: { $regex: "^\\s*\\[" } } }).toArray();
  const repairs = rows.map(row => {
    const images = decode(row.images);
    if (images.length < 1 || images.length > 5) throw new Error(`Invalid image count: ${row._id}`);
    return { row, images };
  });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", repairs: repairs.map(({row, images}) => ({ id: String(row._id), imageCount: images.length })) }));
  if (apply) {
    for (const {row, images} of repairs) {
      // Preserve the original data in a migration-specific backup collection.
      await mongoose.connection.collection("migration_002_image_backups").updateOne({ _id: row._id }, { $setOnInsert: { images: row.images, backedUpAt: new Date() } }, { upsert: true });
      const result = await collection.updateOne({ _id: row._id, images: row.images }, { $set: { images } });
      if (result.matchedCount !== 1) throw new Error("Product changed during repair; rerun after checking it.");
      const saved = await collection.findOne({ _id: row._id });
      if (JSON.stringify(saved?.images) !== JSON.stringify(images)) throw new Error("Image repair verification failed.");
    }
    console.log(JSON.stringify({ repairedAndVerified: repairs.length }));
  }
} catch {
  console.error("Image repair failed. No credentials were logged; review validation/connection and rerun dry-run.");
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
