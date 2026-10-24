import express from 'express'
import { authorize, protect } from '../middleware/auth.js'
import {
    createOrder,
    getAllOrders,
    getOrder,
    getOrders,
    updateOrderStatus,
} from '../controller/ordersController.js'

const OrderRouter = express.Router()

// Get user orders
OrderRouter.get('/', protect, getOrders)

// Create order from cart
OrderRouter.post('/', protect, createOrder)

// Get all orders (Admin only)
OrderRouter.get('/admin/all', protect, authorize('admin'), getAllOrders)

// Update order status (Admin only)
OrderRouter.put('/:id/status', protect, authorize('admin'), updateOrderStatus)

// Get single order
OrderRouter.get('/:id', protect, getOrder)

export default OrderRouter