import {
  loadMyWalletService,
  addMoneyService,
    verifyPaymentService,
} from "../../services/walletService.js";

export const loadMyWallet = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const type = req.query.type || "";
    const limit = 5;

    const { user, wallet, transactions, totalDocuments } =
      await loadMyWalletService(req.session.user._id, { page, type, limit });

    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(202).render("user/wallet", {
      key: process.env.RAZORPAY_KEY_ID,
      title: "My Wallet",
      activePage: "wallet",
      layout: "layouts/user",
      pageCSS: "/style/user/wallet.css",
      wallet,
      transactions,
      user,
      limit,
      totalDocuments,
      query: req.query,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};



export const addMoney = async (req, res) => {
  try {
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login for adding money to your wallet!",
      });
    }

    const result = await addMoneyService(userId,req.body.amount);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("ADD MONEY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Could not initiate payment",
    });
  }
};


export const verifyPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const result = await verifyPaymentService(req.body, userId);
    return res.status(result.status).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Payment verification error",
    });
  }
};



export default {
  loadMyWallet,
  addMoney,
  verifyPayment
};