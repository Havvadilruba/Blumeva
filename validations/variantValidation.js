import Joi from "joi";

const variantValidation = Joi.object({
  quantityValue: Joi.number().positive().required().empty("").messages({
    "any.required": "Variant value is required",
    "number.base": "Variant value must be a number",
    "number.positive": "Variant value must be greater than 0",
  }),

  quantityType: Joi.string().valid("ml", "g").required().empty("").messages({
    "any.required": "Variant type is required",
    "any.only": "Variant type must be either ml or g",
  }),

  regularPrice: Joi.number().min(0).required().empty("").messages({
    "any.required": "Regular price is required",
    "number.base": "Regular price must be a number",
    "number.min": "Regular price cannot be negative",
  }),

  salePrice: Joi.number().min(0).required().empty("").messages({
    "any.required": "Sale price is required",
    "number.base": "Sale price must be a number",
    "number.min": "Sale price cannot be negative",
  }),

  stock: Joi.number().integer().min(0).required().empty("").messages({
    "any.required": "Stock is required",
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),
}).custom((obj, helper) => {
  if (obj.salePrice > obj.regularPrice) {
    return helper.message("Sale price cannot be greater than Regular price");
  }
  return obj;
});

export default variantValidation;



