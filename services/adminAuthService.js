import bcrypt from "bcrypt";
import { findAdminByEmail } from "../repositories/adminRepository.js";

export const loginAdminService = async (email, password) => {
  const admin = await findAdminByEmail(email);

  if (!admin) {
    return { success: false, message: "Admin not found" };
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    return { success: false, message: "Invalid password" };
  }

  return {
    success: true,
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: "admin",
    },
  };
};
