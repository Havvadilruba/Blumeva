export const getAppliedOffer = (data, salePrice) => {
  let bestDiscount = 0;

  // Check Product Offers
  if (data?.productOffer?.length > 0) {
    for (let productOffer of data.productOffer) {
      let discount = 0;

      if (productOffer.discountType === "percentage") {
        discount = salePrice * (productOffer.discountValue / 100);
      } else {
        discount = productOffer.discountValue;
      }

      bestDiscount = Math.max(bestDiscount, discount);
    }
  }

  // Check Category Offers
  if (data?.categoryOffer?.length > 0) {
    for (let categoryOffer of data.categoryOffer) {
      let discount = 0;

      if (categoryOffer.discountType === "percentage") {
        discount = salePrice * (categoryOffer.discountValue / 100);
      } else {
        discount = categoryOffer.discountValue;
      }

      bestDiscount = Math.max(bestDiscount, discount);
    }
  }

  if (bestDiscount <= 0) return null;

  return {
    discountAmount: Math.ceil(bestDiscount),
  };
};
