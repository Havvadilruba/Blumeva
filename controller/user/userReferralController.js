import { findReferralsByReferrer } from "../../repositories/referralRepository.js";
import User from "../../model/userSchema.js";

export const loadReferralPage = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();

    const referrals = await findReferralsByReferrer(userId);

    res.render("user/referral", {
      layout: "layouts/user",
      title: "My Referrals",
      pageCSS: "/style/user/referral.css",
      activePage: "referral",
      referrals,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export default { loadReferralPage };
