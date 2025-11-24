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
      return res.status(401).json({ 
        success: false, 
        message: "Login required"
      });
    }

    const { error } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(422).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { variantId, quantity } = req.body;

    const variant = await Variant
      .findById(variantId)
      .populate("productId");
    
    if (!variant) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    const product = variant.productId;
    const brand = await Brand.findById(product.brand);
    const category = await Category.findById(product.category);

    if (product.isBlocked || !brand?.status || !category?.isListed) {
      return res.status(403).json({ 
        success: false, 
        message: "Product is unavailable" 
      });
    }

    if (variant.stock < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Product is out of stock"
      });
    }

    // Check for existing cart item
    const exists = await Cart.findOne({ 
      userId: req.session.user._id, 
      variantId 
    });

    if (exists) {
      const newQuantity = exists.quantity + (quantity || 1);

      if (newQuantity > variant.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.stock} items available`
        });
      }

      exists.quantity = newQuantity;
      await exists.save();

      return res.status(200).json({
        success: true,
        message: "Quantity updated",
      });
    }

    // Create new cart item
    await Cart.create({
      userId: req.session.user._id,
      productId: product._id,
      variantId,
      quantity: quantity || 1,
    });

    return res.status(201).json({
      success: true, 
      message: "Added to cart" 
    });

  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const cartItems = await getCartItems(userId);
    const totals = calculateCartTotals(cartItems);

    // Check for issues
    const hasOutOfStock = cartItems.some(i => i.stock <= 0);
    const hasInsufficientStock = cartItems.some(i => i.quantity > i.stock);

    // Get checkout error from session if exists
    const checkoutError = req.session.checkoutError;
    delete req.session.checkoutError;

    return res.render("user/cart", {
      layout: "layouts/user",
      title: "Shopping Cart | Blumeva",
      pageCSS: "/style/user/cart.css",
      cart: { items: cartItems, ...totals },
      hasOutOfStock,
      hasInsufficientStock,
      checkoutError
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

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false, 
        message: "Minimum quantity is 1" 
      });
    }

    const cartItem = await Cart
      .findById(cartItemId)
      .populate("variantId");

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found" 
      });
    }

    if (!cartItem.variantId) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found"
      });
    }

    const currentStock = cartItem.variantId.stock;
    const currentQuantity = cartItem.quantity;

    // Handle out of stock
    if (currentStock === 0) {
      return res.status(200).json({
        success: true,
        message: "Item is out of stock",
        updatedItem: {
          quantity: cartItem.quantity,
          salePrice: cartItem.variantId.salePrice,
          regularPrice: cartItem.variantId.regularPrice,
          stock: 0,
          outOfStock: true
        }
      });
    }

   
    if (quantity > currentStock && quantity > currentQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${currentStock} items available`
      });
    }


    cartItem.quantity = quantity;
    await cartItem.save();

    const allItems = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(allItems);

    return res.status(200).json({
      success: true,
      updatedItem: {
        quantity,
        salePrice: cartItem.variantId.salePrice,
        regularPrice: cartItem.variantId.regularPrice,
        stock: currentStock,
        outOfStock: false
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

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID" 
      });
    }

    const removed = await Cart.findOneAndDelete({
      _id: cartItemId,
      userId: req.session.user._id
    });

    if (!removed) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    const remainingItems = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(remainingItems);


    const hasOutOfStock = remainingItems.some(i => i.stock <= 0);
    const hasInsufficientStock = remainingItems.some(i => i.quantity > i.stock);

    return res.status(200).json({
      success: true,
      message: "Item removed",
      totals,
      hasOutOfStock,
      hasInsufficientStock
    });

  } catch (error) {
    console.error("Delete Cart Item Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

export default {
  addToCart,
  loadCart,
  updateCartItem,
  deleteCartItem
}