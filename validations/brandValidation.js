import Joi from "joi";


const brandValidation = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Brand name is required",
    "string.min": "Brand name must be at least 2 characters long",
    "string.max": "Brand name cannot exceed 50 characters",
  }),
  status: Joi.string().optional(),
});

export default brandValidation;

