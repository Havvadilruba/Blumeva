import { getWishlistItemsCount } from "../repositories/wishlistRepository.js";
import { getCartItemsCount } from "../repositories/cartRepository.js";

export const headerCountsMiddleware = async (req, res, next) => {
  try {
    if (!req.session.user) {
      res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
      return next();
    }

    const userId = req.session.user._id;

    const [cartCount, wishlistCount] = await Promise.all([
      getCartItemsCount(userId),
      getWishlistItemsCount(userId)
    ]);

    res.locals.cartCount = cartCount;
    res.locals.wishlistCount = wishlistCount;

    next();
  } catch (err) {
    console.error("Header count error:", err);
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
    next();
  }
};
