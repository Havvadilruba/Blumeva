import Address from "../../model/addressSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";


const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    // Load addresses
    const addresses = await Address.find({ userId })
      .sort({ setDefault: -1 })
      .lean();

    // Get cart items using service
    const cartItems = await getCartItems(userId);
    if (!cartItems?.length) return res.redirect("/cart");

    // Check for out-of-stock items
    const hasOutOfStock = cartItems.some(item => item.stock <= 0);
    if (hasOutOfStock) return res.redirect("/cart");

    // Calculate totals using service
    const totals = calculateCartTotals(cartItems);

    return res.render("user/checkout", {
      layout: "layouts/user",
      title: "Checkout | Blumeva",
      pageCSS: "/style/user/checkout.css",
      addresses,
      cart: { items: cartItems, ...totals },
    });

  } catch (error) {
    console.error("Checkout Page Load Failed:", error);
    return res.redirect("/cart"); // 🚀 Correct: redirect, not render
  }
};

export default { loadCheckout };




