import mongoose from "mongoose";
import { razorpay } from "../config/razorpay.js";
import { findUserById, updateUserWalletBalance } from "../repositories/userRepository.js";
import {
  createLedgerEntry,
  findFilteredTransationCount,
  findTransationByPaymentId,
  findTransations,
} from "../repositories/walletLedgerRepository.js";
import { createWallet, findWalletByUserId, saveWallet } from "../repositories/walletRepository.js";
import { razorpayPaymentValidation } from "../validations/walletValidation.js";
import crypto from "crypto";

export const loadMyWalletService = async (userId, { page, type, limit }) => {
  const user = await findUserById(userId);

  let wallet = await findWalletByUserId(userId);
  if (!wallet) wallet = await createWallet(userId);

  // refund filter
  const filter = { userId };
  
  if (type) {
    const typeUpper = type.toUpperCase();
    filter.type = typeUpper;
  } else {
    // Show all transaction types (including REFUND)
    filter.type = { $in: ["CREDIT", "DEBIT", "REFUND", "REFERRAL"] };
  }
  
  const totalDocuments = await findFilteredTransationCount(filter);
  const transactions = await findTransations(filter, page, limit);

  return { user, wallet, transactions, totalDocuments };
};

export const addMoneyService = async (userId, amount) => {
  if (!amount || amount < 100 || amount > 50000) {
    return {
      success: false,
      status: 400,
      message: "Amount must be between ₹100 and ₹50,000",
    };
  }

  const options = {
    amount: amount * 100, // convert to paise
    currency: "INR",
    receipt:"wallet_" + Date.now(),
    notes: {
      userId: userId.toString(),
      purpose: "WALLET_TOPUP",
    },
  };

  const order = await razorpay.orders.create(options);

  return {
    success: true,
    status: 202,
    order,
  };
};

export const verifyPaymentService = async (data, userId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { error } = razorpayPaymentValidation.validate(data);
    if (error) {
      throw {
        status: 400,
        message: error.details[0].message,
      };
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = data;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw {
        status: 406,
        message: "Payment verification failed",
      };
    }

    const creditAmount = Number(amount) / 100;

    const duplicate = await findTransationByPaymentId(
      razorpay_payment_id,
      "CREDIT"
    );

    if (duplicate) {
      return {
        status: 208,
        success: true,
        message: "Payment already processed",
      };
    }

    let wallet = await findWalletByUserId(userId, session);
    if (!wallet) wallet = await createWallet(userId, session);

    wallet.balance += creditAmount;
    wallet.totalCredits += creditAmount;
    wallet.lastTransactionAt = new Date();
    await saveWallet(wallet, session);

    const entry = {
      walletId: wallet._id,
      userId,
      amount: creditAmount,
      type: "CREDIT",
      note: "Wallet top-up",
      referenceId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      balanceAfter: wallet.balance,
    };

    await createLedgerEntry(entry, session);
    await updateUserWalletBalance(userId, wallet.balance, session);

    await session.commitTransaction();
    session.endSession();

    return {
      status: 202,
      success: true,
      message: "Wallet credited successfully",
      newBalance: wallet.balance,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return {
      status: 404,
      success: false,
      message: error.message,
    };
  }
};