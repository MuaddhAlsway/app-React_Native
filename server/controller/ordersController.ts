import type { Request, Response } from 'express'
import Cart from '../models/Cart.js'
import Order from '../models/order.js'
import Product from '../models/Products.js'

// Create order from the user's cart
// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    try {
        const { shippingAddress, paymentMethod, notes, paymentIntentId } = req.body

        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Shipping address and payment method are required',
            })
        }

        const cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product')

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty',
            })
        }

        const orderItems = cart.items.map((item: any) => ({
            product: item.product._id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
        }))

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)

            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient product stock',
                })
            }

            product.stock -= item.quantity
            await product.save()
        }

        const subtotal = cart.items.reduce(
            (total: number, item: any) => total + item.price * item.quantity,
            0,
        )

        const order = await Order.create({
            user: req.user._id,
            orderNumber: `ORD-${Date.now()}`,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            orderStatus: 'placed',
            tax: 0,
            totalAmount: subtotal,
            notes,
            paymentIntentId,
        })

        if (paymentMethod !== 'stripe') {
            cart.items = []
            cart.totalAmount = 0
            await cart.save()
        }

        return res.status(201).json({ success: true, data: order })
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message })
    }
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