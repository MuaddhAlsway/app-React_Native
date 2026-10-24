import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import Cart from '../models/Cart.js'
import Product from '../models/Products.js'

// Get user cart
// GET /api/cart
export const getCart = async (req: Request, res: Response) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product')

        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [] })
        }

        return res.json({ success: true, data: cart })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Add item to cart
// POST /api/cart/add
export const addToCart = async (req: Request, res: Response) => {
    try {
        const { productId, quantity = 1, size } = req.body

       
        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' })
        }

        const product = await Product.findById(productId)

        if (!product || !product.isActive) {
            return res.status(404).json({ success: false, message: 'Product not found' })
        }

        const itemQuantity = Number(quantity)

        if (!Number.isInteger(itemQuantity) || itemQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' })
        }

        let cart = await Cart.findOne({ user: req.user._id })

        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] })
        }

        const existingItem = cart.items.find(
            (item: any) =>
                item.product.toString() === productId &&
                item.size === size,
        )

        if (existingItem) {
            existingItem.quantity += itemQuantity
        } else {
            cart.items.push({
                product: product._id,
                quantity: itemQuantity,
                price: product.price,
                size,
            } as any)
        }

        cart.calculateTotal()
        await cart.save()

        return res.status(200).json({ success: true, data: cart })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Update cart item quantity
// PUT /api/cart/item/:productId
export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params
        const quantity = Number(req.body.quantity)
        const { size } = req.body

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' })
        }

        const cart = await Cart.findOne({ user: req.user._id })

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' })
        }

        const item = cart.items.find(
            (cartItem: any) =>
                cartItem.product.toString() === productId &&
                cartItem.size === size,
        )

        if (!item) {
            return res.status(404).json({ success: false, message: 'Cart item not found' })
        }

        item.quantity = quantity
        cart.calculateTotal()
        await cart.save()

        return res.json({ success: true, data: cart })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Remove item from cart
// DELETE /api/cart/item/:productId
export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params
        const { size } = req.body

        const cart = await Cart.findOne({ user: req.user._id })

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' })
        }

        cart.items = cart.items.filter(
            (item: any) =>
                item.product.toString() !== productId ||
                item.size !== size,
        ) as typeof cart.items

        cart.calculateTotal()
        await cart.save()

        return res.json({ success: true, data: cart })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Remove all items from cart
// DELETE /api/cart
export const clearCart = async (req: Request, res: Response) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })

        if (!cart) {
            return res.json({
                success: true,
                data: { items: [], totalAmount: 0 },
            })
        }

        cart.items = []
        cart.calculateTotal()
        await cart.save()

        return res.json({ success: true, data: cart })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}