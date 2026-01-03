import User from "../model/userSchema.js";

export const generateUniqueReferralCode = async () => {
  const prefix = "BLM";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 5; attempt++) {
    let code = prefix;
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
  }

  return prefix + Date.now().toString(36).toUpperCase();
};
