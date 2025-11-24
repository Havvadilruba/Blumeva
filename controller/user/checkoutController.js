import Address from "../../model/addressSchema.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";


const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const addresses = await Address.find({ userId })
      .sort({ setDefault: -1 })
      .lean();

    const cartItems = await getCartItems(userId);
    if (!cartItems?.length) return res.redirect("/cart");

    const hasOutOfStock = cartItems.some(item => item.stock <= 0);
    if (hasOutOfStock) return res.redirect("/cart");

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
    return res.redirect("/cart"); 
  }
};

export default { loadCheckout };




