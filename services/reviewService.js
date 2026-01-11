import {
  findReviewByOrderItemId,
  createReviewRepo,
  findOrderByUserAndItem,
  markOrderItemReviewed,
} from "../repositories/reviewRepository.js";;

export const createReviewService = async ({
  userId,
  orderItemId,
  productId,
  variantId,
  rating,
  comment,
}) => {
  // 1️⃣ Prevent duplicate review
  const existingReview = await findReviewByOrderItemId(orderItemId);

  if (existingReview) {
    throw new Error("You have already reviewed this item");
  }

  // 2️⃣ Get order + item validation
  const order = await findOrderByUserAndItem(userId, orderItemId);

  if (!order) {
    throw new Error("Order item not found");
  }

  const orderedItem = order.orderedItems.id(orderItemId);

  if (!orderedItem) {
    throw new Error("Ordered item not found");
  }

  // 3️⃣ Only delivered items allowed
  if (orderedItem.itemStatus !== "Delivered") {
    throw new Error("Only delivered items can be reviewed");
  }

  // 4️⃣ Create review
  await createReviewRepo({
    userId,
    productId,
    variantId,
    orderItemId,
    rating,
    comment,
  });

  // 5️⃣ Update order item
  await markOrderItemReviewed(order, orderItemId);

  return { success: true };
};
