import Joi from "joi";

export const profileValidation = Joi.object({
  name: Joi.string()
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .required()
  .messages({
    "string.pattern.base": "Name can only contain letters, numbers and spaces",
    "string.empty": "Name is required",
  }),
  removePhoto: Joi.string().valid("true", "false").optional(),
});


