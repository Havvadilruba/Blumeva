import {
  findCustomers,
  countCustomers,
  countAllCustomers,
  countBlockedCustomers,
  findCustomerById,
  updateCustomer,
} from "../repositories/customerRepository.js";

export const getCustomerListService = async (search, page, limit) => {
  const filter = search
    ? {
        $or: [
          { name: { $regex: new RegExp(`^${search}`, "i") } },
          { email: { $regex: new RegExp(`^${search}`, "i") } },
        ],
      }
    : {};

  const total = await countCustomers(filter);
  const customers = await findCustomers(filter, page, limit);

  const allCount = await countAllCustomers();
  const blocked = await countBlockedCustomers();
  const active = allCount - blocked;

  return { customers, total, allCount, active, blocked };
};

export const viewCustomerService = async (id) => {
  return await findCustomerById(id);
};

export const toggleCustomerBlockService = async (id) => {
  const user = await findCustomerById(id);
  if (!user) return { success: false, message: "User not found" };

  user.isBlocked = !user.isBlocked;
  await updateCustomer(user);

  return { success: true, isBlocked: user.isBlocked };
};
