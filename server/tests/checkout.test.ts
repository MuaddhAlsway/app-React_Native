import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Products.js';
import Order from '../models/order.js';
import Address from '../models/Address.js';
import { createOrder } from '../controller/ordersController.js';
const user = '69819801a872c913f84d13f4', addressId = '6985ab44a309ee0204588085', productId = '6683db0d7f779795ecfa9907';
let stock = 10, rows: any[] = [], items: any[], failSave = false, ownsAddress = true, ended = 0;
const originals = { session: mongoose.startSession, cart: Cart.findOne, product: Product.updateOne, order: Order.create, address: Address.findOne };
const cart: any = { items: [], totalAmount: 30, async save() { if (failSave) throw new Error('Save failed'); } };
function reset() {
  stock = 10; rows = []; failSave = false; ownsAddress = true;
  items = ['S','M'].map((size, index) => ({ product: { _id: productId, name: 'Test product', isActive: true, sizes: ['S','M'] }, size, quantity: index + 1, price: 10 }));
  cart.items = items; cart.totalAmount = 30;
}
(mongoose as any).startSession = async () => ({
  async withTransaction(fn: Function) {
    const snapshot = { stock, rows: [...rows], items: cart.items, total: cart.totalAmount };
    try { return await fn(); } catch (error) { stock = snapshot.stock; rows = snapshot.rows; cart.items = snapshot.items; cart.totalAmount = snapshot.total; throw error; }
  }, async endSession() { ended++; },
});
(Address as any).findOne = (filter: any) => { assert.equal(filter.user, user); assert.equal(filter._id, addressId); return { session: async () => ownsAddress ? { street: 'Test', city: 'Test', state: 'Test', zipCode: '123', country: 'Test' } : null }; };
(Cart as any).findOne = () => ({ session: () => ({ populate: async () => cart }) });
(Product as any).updateOne = async (filter: any, update: any) => {
  if (stock < filter.stock.$gte) return { modifiedCount: 0 };
  stock += update.$inc.stock; return { modifiedCount: 1 };
};
(Order as any).create = async (input: any[]) => {
  const document = new Order(input[0]); await document.validate();
  rows.push(document.toObject()); return [document];
};
async function call(extra: any = {}) {
  let status = 200, body: any;
  await createOrder({ user: { _id: user }, body: { addressId, paymentMethod: 'cash', ...extra } } as any, { status(n: number) { status = n; return this; }, json(value: any) { body = value; return this; } } as any);
  return { status, body };
}
try {
  reset(); const success = await call({ totalAmount: 0.01 });
  assert.equal(success.status, 201); assert.equal(stock, 7); assert.equal(cart.items.length, 0); assert.equal(rows.length, 1);
  assert.equal(rows[0].subtotal, 30); assert.equal(rows[0].shippingCost, 2); assert.equal(rows[0].totalAmount, 32); assert.equal(rows[0].paymentStatus, 'pending'); assert.equal(rows[0].shippingAddress.zipCode, '123');
  reset(); stock = 2; assert.equal((await call()).status, 400); assert.equal(stock, 2); assert.equal(rows.length, 0); assert.equal(cart.items.length, 2);
  reset(); ownsAddress = false; assert.equal((await call()).status, 404); assert.equal(stock, 10);
  reset(); assert.equal((await call({ paymentMethod: 'stripe' })).status, 400); assert.equal(stock, 10);
  reset(); cart.items = []; assert.equal((await call()).status, 400); assert.equal(rows.length, 0);
  reset(); failSave = true; assert.equal((await call()).status, 500); assert.equal(stock, 10); assert.equal(rows.length, 0); assert.equal(cart.items.length, 2);
  assert.equal(ended, 5);
  console.log('PASS: checkout totals/address snapshot, aggregated stock, cart clear, foreign address, unavailable Stripe, empty cart, insufficient stock, and rollback on save failure. Controller/model validation real; database/session mocked.');
} finally {
  mongoose.startSession = originals.session; Cart.findOne = originals.cart; Product.updateOne = originals.product; Order.create = originals.order; Address.findOne = originals.address;
}
