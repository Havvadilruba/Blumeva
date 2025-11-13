import Joi from "joi";


const productValidation = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 2 characters long"
  }),

  brand: Joi.string().required().messages({
    "string.empty": "Brand is required"
  }),

  category: Joi.string().required().messages({
    "string.empty": "Category is required"
  }),

  description: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Description is required",
    "string.max": "Description should not exceed 500 characters"
  }),
});

export default productValidation;

