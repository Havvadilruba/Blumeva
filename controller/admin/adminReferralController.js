import { findAllReferrals } from "../../repositories/referralRepository.js";

export const listReferrals = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const referrals = await findAllReferrals({}, page, limit);

    res.render("admin/refferals", {
      layout: "layouts/admin",
      title: "Referrals",
      pageCSS: "referrals",
      activePage: "referrals",
      referrals,
    });
  } catch (err) {
    next(err);
  }
};

export default { listReferrals };
