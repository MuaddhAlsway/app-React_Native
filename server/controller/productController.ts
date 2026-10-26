import type { Request, Response } from "express";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";

type UploadedFile = Express.Multer.File;

const uploadFilesToCloudinary = async (
  files: UploadedFile[],
): Promise<string[]> => {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "ecom-app/products" },
            (error, result) => {
              if (error) {
                reject(new Error(`Image upload failed: ${error.message || "Cloudinary rejected the upload."}`));
                return;
              }

              if (!result?.secure_url) {
                reject(new Error("Cloudinary did not return an image URL."));
                return;
              }

              resolve(result.secure_url);
            },
          );

          stream.on("error", () => reject(new Error("Image upload failed: could not send image to Cloudinary.")));
          stream.end(file.buffer);
        }),
    ),
  );
};

const parseSizes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map((size) => size.trim()).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(String).map((size) => size.trim()).filter(Boolean);
    }
  } catch {
    // Accept comma-separated sizes such as "S, M, L".
  }

  return value
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
};

// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const query = { isActive: true };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not get products.";

    return res.status(500).json({ success: false, message });
  }
};

// GET /api/products/:id
export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not get the product.";

    return res.status(500).json({ success: false, message });
  }
};

// POST /api/products
export const createProduct = async (req: Request, res: Response) => {
  let stage: "upload" | "database" = "upload";
  try {
    const files = (req.files as UploadedFile[] | undefined) ?? [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    const imageUrls = await uploadFilesToCloudinary(files);
    const sizes = parseSizes(req.body.sizes);

    stage = "database";
    const product = await Product.create({
      ...req.body,
      price: Number(req.body.price),
      stock: Number(req.body.stock ?? 0),
      isFeatured: req.body.isFeatured === "true",
      images: imageUrls,
      sizes,
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    const detail = error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "The service returned an error without a message.";
    const code = stage === "upload" ? "IMAGE_UPLOAD_FAILED" : "PRODUCT_SAVE_FAILED";
    const message = stage === "upload"
      ? `Image upload failed. ${detail}`
      : `Could not save product. ${detail}`;
    return res.status(stage === "upload" ? 502 : 500).json({ success: false, code, message });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let images = Array.isArray(product.images) ? [...product.images] : [];

    if (req.body.existingImages !== undefined) {
      let retained: unknown = req.body.existingImages;
      // Accept JSON arrays from the edit screen and legacy repeated fields/URLs.
      if (typeof retained === "string") {
        if (retained.trim().startsWith("[")) {
          try { retained = JSON.parse(retained); }
          catch { return res.status(400).json({ success: false, message: "Invalid existing images." }); }
        } else retained = [retained];
      }
      if (!Array.isArray(retained) || retained.some(image => typeof image !== "string" || !product.images.includes(image))) {
        return res.status(400).json({ success: false, message: "Existing images must belong to this product." });
      }
      images = [...new Set(retained as string[])];
    }

    const files = (req.files as UploadedFile[] | undefined) ?? [];
    if (images.length + files.length < 1 || images.length + files.length > 5) {
      return res.status(400).json({ success: false, message: "Keep between one and five product images." });
    }

    if (files.length > 0) {
      const newImageUrls = await uploadFilesToCloudinary(files);
      images = [...images, ...newImageUrls];
    }

    const updates: Record<string, unknown> = { ...req.body };

    delete updates.existingImages;

    if (req.body.sizes !== undefined) {
      updates.sizes = parseSizes(req.body.sizes);
    }

    if (req.body.price !== undefined) {
      updates.price = Number(req.body.price);
    }

    if (req.body.stock !== undefined) {
      updates.stock = Number(req.body.stock);
    }

    if (req.body.isFeatured !== undefined) {
      updates.isFeatured = req.body.isFeatured === "true";
    }

    if (req.body.existingImages !== undefined || files.length > 0) {
      updates.images = images;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    );

    return res.json({ success: true, data: updatedProduct });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update product.";

    return res.status(500).json({ success: false, message });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const cloudinaryUrlPattern =
      /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;

    const deleteResults = await Promise.all(
      (product.images ?? []).map(async (imageUrl: string) => {
        const match = imageUrl.match(cloudinaryUrlPattern);

        if (!match?.[1]) return;

        await cloudinary.uploader.destroy(match[1]);
      }),
    );

    void deleteResults;

    await Product.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete product.";

    return res.status(500).json({ success: false, message });
  }
};