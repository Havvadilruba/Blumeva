import Offer from "../model/offerSchema.js";
import Product from "../model/productSchema.js";
import Category from "../model/categorySchema.js";

// Find offers with filters
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

// Count offers
export const countOffers = async (filter) => {
  return await Offer.countDocuments(filter);
};

// Find offer by ID
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

// Find offer by name and type
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

// Create new offer
export const createOffer = async (offerData) => {
  return await Offer.create(offerData);
};

// Update offer
export const updateOffer = async (id, offerData) => {
  return await Offer.findByIdAndUpdate(id, offerData, { new: true });
};

// Delete offer
export const deleteOffer = async (id) => {
  return await Offer.findByIdAndDelete(id);
};

// Toggle offer status
export const toggleOfferStatusRepo = async (id) => {
  const offer = await Offer.findById(id);
  if (!offer) return null;
  
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
};

// Get analytics
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

// Get active categories
export const getActiveCategories = async () => {
  return await Category.find({ isListed: true }).select('name').lean();
};

// Search products 
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