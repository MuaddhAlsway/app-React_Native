import express from "express"
import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from "../controller/productController.js"
import upload from "../middleware/upload.js";
import { authorize, protect } from "../middleware/auth.js";

const ProductRouter = express.Router()


// Get all products
ProductRouter.get('/', getProducts);

// Get single Product
ProductRouter.get('/:id', getProduct)

// Create product (admin only)
ProductRouter.post('/', upload.array("images", 5), protect, authorize('admin'), createProduct)

// Update product (admin only)
ProductRouter.put('/:id', upload.array("images", 5), protect, authorize('admin'), updateProduct)


// delete product (admin only)
ProductRouter.delete('/:id',  protect, authorize('admin'), deleteProduct)

export default ProductRouter