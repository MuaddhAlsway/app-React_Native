import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import Wishlist from '../models/Wishlist.js'
import Product from '../models/Products.js'

// Get the current user's wishlist
// GET /api/wishlist
export const getWishlist = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('products')
        // Reading Favorites must not create empty database records.
        return res.json({ success: true, data: wishlist ?? { user: req.user._id, products: [] } })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Add a product to the wishlist
// POST /api/wishlist/:productId
export const addToWishlist = async (req: Request, res: Response) => {
    try {
       const productId = Array.isArray(req.params.productId)
    ? req.params.productId[0]
    : req.params.productId

if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
    })
}

        const product = await Product.findById(productId)

        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            })
        }

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { $addToSet: { products: productId } },
            { upsert: true, new: true },
        ).populate('products')

        return res.json({ success: true, data: wishlist })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Remove a product from the wishlist
// DELETE /api/wishlist/:productId
export const removeFromWishlist = async (req: Request, res: Response) => {
    try {
       const productIdParam = req.params.productId
const productId = Array.isArray(productIdParam)
    ? productIdParam[0]
    : productIdParam

if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
    })
}

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { $pull: { products: productId } },
            { new: true },
        ).populate('products')

        if (!wishlist) return res.json({ success: true, data: { user: req.user._id, products: [] } })

        return res.json({ success: true, data: wishlist })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}