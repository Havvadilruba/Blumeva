import Joi from "joi";

const changePassValidation = Joi.object({
  currentPassword: Joi.string()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      "string.empty": "Current password is required",
      "string.min": "Current password must be at least 8 characters long",
      "string.pattern.base": "Current password must contain letters and numbers",
    }),

  newPassword: Joi.string()
    .min(8)
    .max(30)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters long",
      "string.pattern.base": "New password must contain letters and numbers",
    }),

  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "string.empty": "Confirm password is required",
    }),
})
  .custom((value, helpers) => {
    if (value.currentPassword === value.newPassword) {
      return helpers.error("any.invalid");
    }
    return value;
  })
  .messages({
    "any.invalid": "New password must be different from current password",
  });

export default changePassValidation;
