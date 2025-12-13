// services/cartServices.js
import {
  getCartItemsRepo,
  findCartItemRepo,
  createCartItemRepo,
  updateCartItemQuantityRepo,
  findCartByIdRepo,
  removeCartItemRepo
} from "../repositories/cartRepository.js";

export const getCartItems = (userId) => {
  return getCartItemsRepo(userId);
};

export const findCartItem = findCartItemRepo;
export const createCartItem = createCartItemRepo;
export const updateCartQuantity = updateCartItemQuantityRepo;
export const findCartById = findCartByIdRepo;
export const removeCartItem = removeCartItemRepo;

export const calculateCartTotals = (items) => {
  let subtotal = 0;
  let discount = 0;

  items.forEach(item => {
    const stock = item.stock || 0;
    const regular = item.regularPrice || 0;
    const sale = item.salePrice || 0;
    const offer = item.discountAmount || 0;
    const qty = item.quantity || 1;

    if (stock > 0) {
      const basePrice = sale > 0 ? sale : regular;
      let currentPrice = basePrice - offer;

      if (currentPrice < 0) currentPrice = 0;

      subtotal += currentPrice * qty;

      let perUnitDiscount = 0;
      if (regular > 0 && regular > currentPrice) {
        perUnitDiscount = regular - currentPrice;
      } else if (basePrice > currentPrice) {
        perUnitDiscount = basePrice - currentPrice;
      }

      discount += perUnitDiscount * qty;
    }
  });

  const tax = Math.round(subtotal * 0.05);
  const deliveryCharge = 0;
  const total = subtotal + tax + deliveryCharge;

  return { subtotal, discount, tax, deliveryCharge, total };
};


