import Cart from "../../model/cartSchema.js";
import Variant from "../../model/variantSchema.js";
import Product from "../../model/productSchema.js";
import Brand from "../../model/brandSchema.js";
import Category from "../../model/categorySchema.js";
import mongoose from "mongoose";
import { addToCartSchema } from "../../validations/cartValidation.js";
import { getCartItems, calculateCartTotals } from "../../services/cartServices.js";

 const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { variantId, quantity } = req.body;

    const variant = await Variant.findById(variantId).populate("productId");
    if (!variant) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = variant.productId;
    const brand = await Brand.findById(product.brand);
    const category = await Category.findById(product.category);

    if (product.isBlocked || !brand.status || !category.isListed) {
      return res.status(403).json({ success: false, message: "Product is currently unavailable" });
    }

    if (variant.stock < 1) {
      return res.status(400).json({ success: false, message: "Product is out of stock" });
    }

    // Duplicate check
    const exists = await Cart.findOne({ userId: req.session.user._id, variantId });

    if (exists) {
      exists.quantity += quantity || 1;

      if (exists.quantity > variant.stock) {
        return res.status(400).json({ success: false, message: `Only ${variant.stock} items available` });
      }

      await exists.save();

      return res.status(200).json({
        success: true,
        message: "Quantity updated",
      });
    }

    // Add new record
    await Cart.create({
      userId: req.session.user._id,
      productId: product._id,
      variantId,
      quantity: quantity || 1,
    });

    return res.status(201).json({ success: true, message: "Added to cart" });

  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
                         
const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    // Use service to fetch items
    const cartItems = await getCartItems(userId);

    const totals = calculateCartTotals(cartItems);

    // Include blocked / disabled
    // Only check out of stock items
const hasOutOfStock = cartItems.some(i => i.stock <= 0);


    return res.render("user/cart", {
      layout: "layouts/user",
      title: "Shopping Cart | Blumeva",
      pageCSS: "/style/user/cart.css",
      cart: { items: cartItems, ...totals },
      hasOutOfStock
    });

  } catch (err) {
    console.error("Load Cart Error:", err);
    res.status(500).send("Internal Server Error");
  }
};



const updateCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    const cartItem = await Cart.findById(cartItemId).populate("variantId");
    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Minimum quantity is 1" });
    }

    // Exceeds stock check
    if (quantity > cartItem.variantId.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${cartItem.variantId.stock} items available`
      });
    }

    // If stock is zero
    if (cartItem.variantId.stock === 0) {
      return res.status(200).json({
        success: true,
        updatedItem: {
          quantity: cartItem.quantity,
          stock: 0,
          outOfStock: true
        }
      });
    }

    // Update quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    // Get updated cart items from service and calculate totals
    const allItems = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(allItems);

    return res.status(200).json({
      success: true,
      updatedItem: {
        quantity,
        salePrice: cartItem.variantId.salePrice,
        regularPrice: cartItem.variantId.regularPrice,
        stock: cartItem.variantId.stock
      },
      totals
    });

  } catch (error) {
    console.error("Cart update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const deleteCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;

    const removed = await Cart.findOneAndDelete({
      _id: cartItemId,
      userId: req.session.user._id
    });

    if (!removed) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // Get updated items and totals using service
    const remainingItems = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(remainingItems);

    return res.status(200).json({
      success: true,
      message: "Item removed",
      totals
    });

  } catch (error) {
    console.error("Delete Cart Item Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default{
    addToCart,
    loadCart,
    updateCartItem,
    deleteCartItem
}

