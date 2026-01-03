import TempOrder from "../model/tempOrderSchema.js";

// ----------------------------------------------
// Create Temp Order (Used before Razorpay payment)
// ----------------------------------------------
export const createTempOrder = (data, session) => {
  return TempOrder.create([data], { session });
};

// ----------------------------------------------
// Update Temp Order
// ----------------------------------------------
export const updateTempOrder = (id, data, session) => {
  const options = session ? { session } : {};
  return TempOrder.updateOne({ _id: id }, { $set: data }, options);
};

// ----------------------------------------------
// Find Temp Order by ID
// ----------------------------------------------
export const findTempOrderById = (id) => {
  return TempOrder.findById(id);
};

// ----------------------------------------------
// Delete Temp Order
// ----------------------------------------------
export const deleteTempOrder = (id, session) => {
  const options = session ? { session } : {};
  return TempOrder.deleteOne({ _id: id }, options);
};

