import express from 'express'
import { protect } from '../middleware/auth.js'
import {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
} from '../controller/wishlistController.js'

const wishlistRouter = express.Router()

// Get the current user's wishlist
wishlistRouter.get('/', protect, getWishlist)

// Add a product to the current user's wishlist
wishlistRouter.post('/:productId', protect, addToWishlist)

// Remove a product from the current user's wishlist
wishlistRouter.delete('/:productId', protect, removeFromWishlist)

export default wishlistRouter