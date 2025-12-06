import User from "../model/userSchema.js";

export const findCustomers = async (filter, page, limit) => {
  return await User.find(filter)
    .collation({ locale: "en", strength: 2 })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

export const countCustomers = async (filter) => {
  return await User.countDocuments(filter);
};

export const countAllCustomers = async () => {
  return await User.countDocuments();
};

export const countBlockedCustomers = async () => {
  return await User.countDocuments({ isBlocked: true });
};

export const findCustomerById = async (id) => {
  return await User.findById(id);
};

export const updateCustomer = async (customer) => {
  return await customer.save();
};
