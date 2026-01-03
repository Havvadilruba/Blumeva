import mongoose from "mongoose";
import crypto from "crypto";
import { razorpay } from "../config/razorpay.js";

import { createTempOrder,
  findTempOrderById,
  updateTempOrder,
  deleteTempOrder } from "../repositories/tempOrderRepository.js";
  import {
  createOrder
} from "../repositories/orderRepository.js";
import Order from "../model/orderSchema.js";
import Cart from "../model/cartSchema.js";
import Coupon from "../model/couponSchema.js";
import { couponUsageCreate } from "../repositories/couponUsageRepository.js";

import Variant from "../model/variantSchema.js";



export const createRazorpayOrderService = async ({ amount, tempOrderId }) => {
  const options = {
    amount: amount * 100,    // Convert to paise
    currency: "INR",
    receipt: `temp_${tempOrderId}`,
  };

  return await razorpay.orders.create(options);
};


