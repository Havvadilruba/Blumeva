import Banner from "../model/bannerSchema.js";

export const createBannerRepo = (data) => {
  return Banner.create(data);
};

export const getAllBannersRepo = () => {
  return Banner.find().sort({ createdAt: -1 });
};

export const getBannerByIdRepo = (id) => {
  return Banner.findById(id);
};

export const updateBannerRepo = (id, data) => {
  return Banner.findByIdAndUpdate(id, data, { new: true });
};

export const deleteBannerRepo = (id) => {
  return Banner.findByIdAndDelete(id);
};

export const toggleBannerStatusRepo = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new Error('Banner not found');
  }
  banner.isActive = !banner.isActive;
  return await banner.save();
};
export const deactivateOtherBannersRepo = async (excludeId = null) => {
  const filter = excludeId
    ? { _id: { $ne: excludeId } }
    : {};

  return Banner.updateMany(filter, { isActive: false });
};