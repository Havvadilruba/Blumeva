import Joi from "joi";

export const addToCartSchema = Joi.object({
  variantId: Joi.string()
    .required()
    .messages({
      "string.empty": "Variant ID is required",
      "any.required": "Variant ID is required",
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      "number.base": "Quantity must be a number",
      "number.min": "Minimum quantity is 1",
    }),
});
