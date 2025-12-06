import Admin from "../model/adminSchema.js";

export const findAdminByEmail = async (email) => {
  return await Admin.findOne({ email });
};
