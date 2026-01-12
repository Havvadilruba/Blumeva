import { createReviewService } from "../../services/reviewService.js";

export const createReview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderItemId, productId, variantId, rating, comment } = req.body;

    // Basic validation
    if (!orderItemId || !productId || !variantId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Required review fields are missing",
      });
    }

    await createReviewService({
      userId,
      orderItemId,
      productId,
      variantId,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};
export default {
  createReview
};