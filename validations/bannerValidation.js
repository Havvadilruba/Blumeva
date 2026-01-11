import Joi from "joi";

// Schema for creating new banners (all required fields)
export const createBannerSchema = Joi.object({
  title: Joi.string().trim().min(3).required().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.empty': 'Title cannot be empty',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().allow("", null).optional(),
  ctaText: Joi.string().trim().optional().default("Shop Now"),
  link: Joi.string().trim().required().messages({
    'string.empty': 'Link cannot be empty',
    'any.required': 'Link is required'
  }),
  startDate: Joi.date().iso().required().messages({
    'date.base': 'Invalid start date format',
    'any.required': 'Start date is required'
  }),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
    'date.base': 'Invalid end date format',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  isActive: Joi.boolean().optional().default(true)
});

// Schema for updating banners (all optional)
export const updateBannerSchema = Joi.object({
  title: Joi.string().trim().min(3).messages({
    'string.min': 'Title must be at least 3 characters long'
  }),
  description: Joi.string().allow("", null),
  ctaText: Joi.string().trim(),
  link: Joi.string().trim().pattern(/^\//).messages({
    'string.pattern.base': 'Link must start with /'
  }),
  startDate: Joi.date(),
  endDate: Joi.date().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref("startDate")).messages({
      'date.greater': 'End date must be after start date'
    }),
    otherwise: Joi.date()
  }),
  isActive: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be updated'
});

// Keep backward compatibility
export const bannerSchema = createBannerSchema;