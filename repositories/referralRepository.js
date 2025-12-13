import Referral from "../model/referralSchema.js";

export const createReferralRecord = (data, session = null) => {
  const options = session ? { session } : {};
  return Referral.create([data], options);
};

export const findReferralsByReferrer = (referrerId) => {
  return Referral.find({ referrer: referrerId })
    .populate("referred", "name email createdAt")
    .sort({ createdAt: -1 });
};

export const findAllReferrals = (filter = {}, page = 1, limit = 20) => {
  return Referral.find(filter)
    .populate("referrer", "name email")
    .populate("referred", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

