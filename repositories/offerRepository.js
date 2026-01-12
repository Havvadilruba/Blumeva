import Offer from "../model/offerSchema.js";
import Product from "../model/productSchema.js";
import Category from "../model/categorySchema.js";


export const findOffers = async (filter, page, limit) => {
  const skip = (page - 1) * limit;
  
  return await Offer.find(filter)
    .populate({
      path: 'productID',
      populate: {
        path: 'brand',
        select: 'name logo'
      }
    })
    .populate('categoryID')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};


export const countOffers = async (filter) => {
  return await Offer.countDocuments(filter);
};


export const findOfferById = async (id) => {
  return await Offer.findById(id)
    .populate({
      path: 'productID',
      populate: {
        path: 'brand',
        select: 'name logo'
      }
    })
    .populate('categoryID')
    .lean();
};


export const findOfferByName = async (offerName, offerType, excludeId = null) => {
  const query = { 
    offerName: { $regex: new RegExp(`^${offerName}$`, 'i') },
    offerType 
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await Offer.findOne(query);
};

export const createOffer = async (offerData) => {
  return await Offer.create(offerData);
};


export const updateOffer = async (id, offerData) => {
  return await Offer.findByIdAndUpdate(id, offerData, { new: true });
};


export const deleteOffer = async (id) => {
  return await Offer.findByIdAndDelete(id);
};


export const toggleOfferStatusRepo = async (id) => {
  const offer = await Offer.findById(id);
  if (!offer) return null;
  
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
};


export const getOfferAnalytics = async () => {
  const now = new Date();
  
  const [totalOffers, activeOffers, productOffers, categoryOffers] = await Promise.all([
    Offer.countDocuments(),
    Offer.countDocuments({ 
      isActive: true, 
      startDate: { $lte: now }, 
      endDate: { $gte: now } 
    }),
    Offer.countDocuments({ offerType: 'product' }),
    Offer.countDocuments({ offerType: 'category' })
  ]);
  
  return {
    totalOffers,
    activeOffers,
    productOffers,
    categoryOffers
  };
};


export const getActiveCategories = async () => {
  return await Category.find({ isListed: true }).select('name').lean();
};


export const searchProducts = async (query) => {
  return await Product.find({
    name: { $regex: query, $options: 'i' },
    isBlocked: false
  })
  .populate('brand', 'name logo')
  .populate('category', 'name')
  .select('name images brand category')
  .limit(20)
  .lean();
};


export const getAvailableProductOffers = async (now) => {
  return Offer.find({
    offerType: 'product',
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true,
  }).lean();
};


export const getAvailableCategoryOffers = async (now) => {
  return Offer.find({
    offerType: 'category',
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true,
  }).lean();
};
