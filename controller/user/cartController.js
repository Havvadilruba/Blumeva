// controller/user/cartController.js

import Variant from "../../model/variantSchema.js";
import Product from "../../model/productSchema.js";
import Brand from "../../model/brandSchema.js";
import Category from "../../model/categorySchema.js";
import Cart from "../../model/cartSchema.js"
import mongoose from "mongoose";

import { addToCartSchema } from "../../validations/cartValidation.js";

import {
  getCartItems,
  calculateCartTotals,
  findCartItem,
  createCartItem,
  updateCartQuantity,
  findCartById,
  removeCartItem
} from "../../services/cartServices.js";

const MaxQuantity = 5;

import { checkInWishlist, removeWishlistItem } from "../../repositories/wishlistRepository.js";

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
        message: error.details[0].message,
      });
    }

    const { variantId, quantity } = req.body;
    const userId = req.session.user._id;

    const variant = await Variant.findById(variantId).populate("productId");
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

    if (quantity > MaxQuantity) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxQuantity} items allowed per product`,
      });
    }

    const inWishlist = await checkInWishlist(userId, variant.productId._id, variant._id);
    if (inWishlist) {
      await removeWishlistItem(userId, variant.productId._id, variant._id);
    }

    // Check existing item
    const exists = await findCartItem(userId, variantId);

    if (exists) {
      const newQty = exists.quantity + (quantity || 1);

      if (newQty > variant.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.stock} items available`
        });
      }

        if (newQty > MaxQuantity) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MaxQuantity} items allowed per product`,
        });
      }

      exists.quantity = newQty;


      await exists.save();

      return res.status(200).json({
        success: true,
        message: "Quantity updated",
      });
    }

    // Create new item
    await createCartItem({
      userId,
      productId: product._id,
      variantId,
      quantity: quantity || 1,
    });

    return res.status(201).json({
      success: true,
      message: "Added to cart"
    });

  } catch (err) {
    console.error("Add To Cart Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const loadCart = async (req, res) => {
  try {
    if (req.session.appliedCoupon) req.session.appliedCoupon = null;
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/login");

    const cartItems = await getCartItems(userId);
    const totals = calculateCartTotals(cartItems);

    const hasOutOfStock = cartItems.some(i => i.stock <= 0);
    const hasInsufficientStock = cartItems.some(i => i.quantity > i.stock);

    const checkoutError = req.session.checkoutError;
    delete req.session.checkoutError;

    res.render("user/cart", {
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

    const cartItem = await findCartById(cartItemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    const stock = cartItem.variantId.stock;
    const currentQty = cartItem.quantity;

    if (stock === 0) {
      return res.status(200).json({
        success: true,
        message: "Item is out of stock",
        updatedItem: {
          quantity: currentQty,
          salePrice: cartItem.variantId.salePrice,
          regularPrice: cartItem.variantId.regularPrice,
          stock: 0,
          outOfStock: true,
          discountAmount: 0
        }
      });
    }

      if (quantity > MaxQuantity && quantity > currentQty) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MaxQuantity} items allowed per product`,
      });
    }

    
    if (quantity > stock && quantity > currentQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${stock} items available`
      });
    }

    await updateCartQuantity(cartItemId, quantity);

    const allItems = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(allItems);

  
    const updatedAggItem = allItems.find(
      i => i._id.toString() === cartItemId.toString()
    );

    return res.status(200).json({
      success: true,
      updatedItem: {
        quantity,
        salePrice: cartItem.variantId.salePrice,
        regularPrice: cartItem.variantId.regularPrice,
        stock,
        outOfStock: false,
        discountAmount: updatedAggItem?.discountAmount || 0
      },
      totals
    });

  } catch (err) {
    console.error("Update Cart Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


const deleteCartItem = async (req, res) => {
  try {
    const cartItemId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart ID"
      });
    }

    const removed = await removeCartItem(cartItemId, req.session.user._id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    const remaining = await getCartItems(req.session.user._id);
    const totals = calculateCartTotals(remaining);

    const hasOutOfStock = remaining.some(i => i.stock <= 0);
    const hasInsufficientStock = remaining.some(i => i.quantity > i.stock);

    return res.status(200).json({
      success: true,
      message: "Item removed",
      totals,
      hasOutOfStock,
      hasInsufficientStock
    });

  } catch (err) {
    console.error("Delete Cart Error:", err);
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
};

