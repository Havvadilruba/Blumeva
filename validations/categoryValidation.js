import Joi from "joi";


const categoryValidation = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[A-Za-z0-9\s&-]+$/)
    .required()
    .messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must have at least 3 characters",
      "string.pattern.base": "Category name can only contain letters, numbers, spaces, & or -",
    }),
});

export default categoryValidation;

