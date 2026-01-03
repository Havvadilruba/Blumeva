import Joi from "joi";


const productValidation = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .required()
    .empty("")
    .messages({
      "string.empty": "Product name is required",
      "string.min": "Product name must be at least 2 characters long",
    }),

  brand: Joi.string()
    .required()
    .empty("")
    .messages({
      "string.empty": "Brand is required",
    }),

  category: Joi.string()
    .required()
    .empty("")
    .messages({
      "string.empty": "Category is required",
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .empty("")
    .messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 10 characters",
    }),
});

export default productValidation;

