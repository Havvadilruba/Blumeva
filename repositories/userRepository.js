import userModel from "../model/userSchema.js";

export const findUserById = (userId) => {
  return userModel.findById(userId);
};

export const updateUserWalletBalance = (_id, walletBalance, session = null) => {
  const options = session ? { session } : {};
  return userModel.updateOne({ _id }, { walletBalance }, options);
};