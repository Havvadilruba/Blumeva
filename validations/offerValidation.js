import Joi from "joi";

export const offerSchema = Joi.object({
  offerType: Joi.string()
    .valid("product", "category")
    .required()
    .messages({
      "any.only": "Offer type must be either product or category",
      "any.required": "Offer type is required",
    }),

  offerName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      "string.empty": "Offer name is required",
      "string.min": "Offer name must be at least 3 characters",
      "string.max": "Offer name cannot exceed 100 characters",
    }),

  discountType: Joi.string()
    .valid("percentage", "fixed")
    .required()
    .messages({
      "any.only": "Discount type must be either percentage or fixed",
      "any.required": "Discount type is required",
    }),

  discountValue: Joi.number()
    .min(1)
    .required()
    .when("discountType", {
      is: "percentage",
      then: Joi.number().max(90).messages({
        "number.max": "Percentage discount cannot exceed 90%",
      }),
    })
    .messages({
      "number.base": "Discount value must be a number",
      "number.min": "Discount value must be at least 1",
      "any.required": "Discount value is required",
    }),

  productID: Joi.array()
    .items(Joi.string().length(24))
    .when("offerType", {
      is: "product",
      then: Joi.array()
        .min(1)
        .required()
        .messages({
          "array.min": "At least one product must be selected for product offer",
          "any.required": "Product list is required for product offer",
        }),
      otherwise: Joi.forbidden(),
    }),

  categoryID: Joi.string()
    .length(24)
    .when("offerType", {
      is: "category",
      then: Joi.string()
        .required()
        .messages({
          "any.required": "Category is required for category offer",
          "string.length": "Invalid category ID format",
        }),
      otherwise: Joi.forbidden(),
    }),

  startDate: Joi.date()
    .required()
    .messages({
      "date.base": "Start date must be a valid date",
      "any.required": "Start date is required",
    }),

  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .required()
    .messages({
      "date.greater": "End date must be after start date",
      "date.base": "End date must be a valid date",
      "any.required": "End date is required",
    }),

  isActive: Joi.boolean()
    .optional()
    .default(true),
});
