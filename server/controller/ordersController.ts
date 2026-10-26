import type { Request, Response } from 'express'
import Cart from '../models/Cart.js'
import Order from '../models/order.js'
import Product from '../models/Products.js'
import Address from '../models/Address.js'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'

// Create order from the user's cart
// POST /api/orders
class CheckoutError extends Error {
    constructor(message: string, public status = 400) { super(message) }
}

export const createOrder = async (req: Request, res: Response) => {
    const { addressId, paymentMethod, notes } = req.body
    if (!mongoose.isObjectIdOrHexString(addressId)) {
        return res.status(400).json({ success: false, message: 'Select a valid saved shipping address.' })
    }
    if (paymentMethod !== 'cash') {
        return res.status(400).json({ success: false, message: 'Only cash on delivery is available. Card payment is not implemented.' })
    }
    const session = await mongoose.startSession()
    try {
        const order = await session.withTransaction(async () => {
            const address = await Address.findOne({ _id: addressId, user: req.user._id }).session(session)
            if (!address) throw new CheckoutError('Shipping address not found.', 404)
            const cart = await Cart.findOne({ user: req.user._id }).session(session).populate('items.product')
            if (!cart || cart.items.length === 0) throw new CheckoutError('Cart is empty.')
            const quantities = new Map<string, number>()
            let subtotalCents = 0
            const items = cart.items.map((item: any) => {
                const product = item.product
                if (!product || !product.isActive) throw new CheckoutError('A cart product is no longer available.')
                if (!Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0) throw new CheckoutError('Invalid cart item.')
                if (product.sizes?.length && !product.sizes.includes(item.size)) throw new CheckoutError('A selected size is no longer available.')
                const id = String(product._id)
                quantities.set(id, (quantities.get(id) || 0) + item.quantity)
                subtotalCents += Math.round(item.price * 100) * item.quantity
                return { product: product._id, name: product.name, quantity: item.quantity, price: item.price, size: item.size }
            })
            // Aggregate sizes of the same product before reserving stock.
            for (const [id, quantity] of quantities) {
                const result = await Product.updateOne({ _id: id, isActive: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { session })
                if (result.modifiedCount !== 1) throw new CheckoutError('Insufficient product stock.')
            }
            const subtotal = subtotalCents / 100
            const shippingCost = 2
            const tax = 0
            const [created] = await Order.create([{
                user: req.user._id, orderNumber: 'ORD-' + randomUUID(), items,
                shippingAddress: { street: address.street, city: address.city, state: address.state, zipCode: address.zipCode, country: address.country },
                paymentMethod: 'cash', paymentStatus: 'pending', orderStatus: 'placed',
                subtotal, shippingCost, tax, totalAmount: (subtotalCents + 200) / 100,
                notes: typeof notes === 'string' ? notes.trim() : undefined,
            }], { session })
            cart.items = []
            cart.totalAmount = 0
            await cart.save({ session })
            return created
        })
        return res.status(201).json({ success: true, data: order })
    } catch (error) {
        if (error instanceof CheckoutError) return res.status(error.status).json({ success: false, message: error.message })
        return res.status(500).json({ success: false, message: 'Could not place order. No partial checkout changes were committed.' })
    } finally { await session.endSession() }
}

// Get signed-in user's orders
// GET /api/orders
export const getOrders = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })

        return res.json({ success: true, data: orders })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Get one order
// GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name images')

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            })
        }

        if (
            order.user.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized',
            })
        }

        return res.json({ success: true, data: order })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Update order status
// PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderStatus, paymentStatus } = req.body

        const order = await Order.findById(req.params.id)

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            })
        }

        if (orderStatus) order.orderStatus = orderStatus
        if (paymentStatus) order.paymentStatus = paymentStatus
        if (orderStatus === 'delivered') order.deliveredAt = new Date()

        await order.save()

        return res.json({ success: true, data: order })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Get all orders
// GET /api/orders/admin/all
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, status } = req.query
        const query: any = {}

        if (status) query.orderStatus = status

        const total = await Order.countDocuments(query)
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))

        return res.json({
            success: true,
            data: orders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
}