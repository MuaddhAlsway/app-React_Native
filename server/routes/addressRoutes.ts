import express from "express"
import Address from "../models/Address.js"
import { protect } from "../middleware/auth.js"
import { addAddress, deleteAddress, getAddresses, updateAddress } from "../controller/addressController.js"


const AddressRouter = express.Router()

AddressRouter.get('/', protect,getAddresses)
AddressRouter.post("/", protect, addAddress)
AddressRouter.put("/:id", protect, updateAddress);
AddressRouter.delete("/:id", protect, deleteAddress)

export default AddressRouter