import express from 'express'
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from '../controller/cartController.js'
import { protect } from '../middleware/auth.js'

const CartRouter = express.Router()

// Get the current user's cart
CartRouter.get('/', protect, getCart)

// Add an item to the current user's cart
CartRouter.post('/add', protect, addToCart)

// Update an item's quantity
CartRouter.put('/item/:productId', protect, updateCartItem)

// Remove an item from the cart
CartRouter.delete('/item/:productId', protect, removeCartItem)

// Remove all items from the cart
CartRouter.delete('/', protect, clearCart)

export default CartRouter