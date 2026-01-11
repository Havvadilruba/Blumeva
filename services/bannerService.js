import {
  createBannerRepo,
  getAllBannersRepo,
  getBannerByIdRepo,
  updateBannerRepo,
  deleteBannerRepo,
  toggleBannerStatusRepo,
  deactivateOtherBannersRepo
} from "../repositories/bannerRepository.js";
import Banner from "../model/bannerSchema.js";


export const createBannerService = async (data) => {
  if (data.isActive) {
    await deactivateOtherBannersRepo();
  }

  return await createBannerRepo(data);
};

export const getAllBannersService = async () => {
  return await getAllBannersRepo();
};

export const getBannerByIdService = async (id) => {
  return await getBannerByIdRepo(id);
};

export const updateBannerService = async (id, data) => {
  if (data.isActive) {
    
    await deactivateOtherBannersRepo(id);
  }

  return await updateBannerRepo(id, data);
};

export const deleteBannerService = async (id) => {
  return await deleteBannerRepo(id);
};

export const toggleBannerStatusService = async (id) => {
  const banner = await toggleBannerStatusRepo(id);

  if (banner.isActive) {
    await deactivateOtherBannersRepo(id);
  }

  return banner;
};

export const getLiveBannerService = async () => {
  const now = new Date();

  return await Banner.findOne({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ createdAt: -1 });
};

