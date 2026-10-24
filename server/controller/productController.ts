import { Request, Response } from "express";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";

// Get all products
// Get /api/products
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const query: any = { isActive: true };

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: products,
            pageInation: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Get single product
// Get /api/product/id
export const getProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const createProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        // Handle file uploads
        if ((req.files as any)?.length > 0) {
            const uploadPromises = (req.files as any).map((file: any) => {
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'ecom-app/products' },
                        (error, result) => {
                            if (error) reject(error);
                            else if (result?.secure_url) resolve(result.secure_url);
                            else reject(new Error("Image upload failed"));
                        }
                    );

                    uploadStream.end(file.buffer);
                });
            });

            images = await Promise.all(uploadPromises);
        }

        let sizes = req.body.sizes || [];
        if (typeof sizes === "string") {
            try {
                sizes = JSON.parse(sizes);
            } catch (e) {
                sizes = sizes.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
            }
        }

        // Ensure they are arrays
        if (!Array.isArray(sizes)) sizes = [sizes];

        const productData = {
            ...req.body,
            images: images,
            sizes
        };

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: "Please upload at least one image" });
        }

        const product = await Product.create(productData);
        res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const updateProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        if (req.body.existingImages) {
            if (Array.isArray(req.body.existingImages)) {
                images = [...req.body.existingImages];
            } else {
                images = [req.body.existingImages];
            }
        }

        // Handle file uploads
        if ((req.files as any)?.length > 0) {
            const uploadPromises = (req.files as any).map((file: any) => {
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'ecom-app/products' },
                        (error, result) => {
                            if (error) reject(error);
                            else if (result?.secure_url) resolve(result.secure_url);
                            else reject(new Error("Image upload failed"));
                        }
                    );

                    uploadStream.end(file.buffer);
                });
            });

            const newImages = await Promise.all(uploadPromises);
            images = [...images, ...newImages];
        }

        const updates = { ...req.body };

        if (req.body.sizes) {
            let sizes = req.body.sizes;

            if (typeof sizes === "string") {
                try {
                    sizes = JSON.parse(sizes);
                } catch (e) {
                    sizes = sizes.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
                }
            }

            if (!Array.isArray(sizes)) sizes = [sizes];

            updates.sizes = sizes;
        }

        if (req.body.existingImages || ((req.files as any)?.length > 0)) {
            updates.images = images;
        }

        delete updates.existingImages;

        const product = await Product.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, data: product });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Delete product
// Delete /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // DELETE IMAGES FROM CLOUDINARY
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map((imageUrl: string) => {
                const publicIdMatch = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/);
                const publicId = publicIdMatch ? publicIdMatch[1] : null;

                if (publicId) {
                    return cloudinary.uploader.destroy(publicId);
                }

                return Promise.resolve();
            });

            await Promise.all(deletePromises);
        }

        await Product.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: "Product deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}