import {
  findOffers,
  countOffers,
  findOfferById,
  findOfferByName,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatusRepo,
  getOfferAnalytics,
  getActiveCategories,
  searchProducts
} from "../repositories/offerRepository.js";

// Get offers page data with filters
export const getOfferPageDataService = async (
  offerType,
  searchQuery,
  statusFilter,
  sortFilter,
  currentPage,
  limit = 10
) => {
  try {
    // Build filter query
    const filter = { offerType };
    
    // Search filter
    if (searchQuery) {
      filter.offerName = { $regex: searchQuery, $options: 'i' };
    }
    
    // Status filter
    const now = new Date();
    if (statusFilter === 'active') {
      filter.isActive = true;
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    } else if (statusFilter === 'inactive') {
      filter.isActive = false;
    } else if (statusFilter === 'expired') {
      filter.endDate = { $lt: now };
    }
    
    // Get total count
    const totalOffers = await countOffers(filter);
    const totalPages = Math.ceil(totalOffers / limit);
    
    // Get offers
    let offers = await findOffers(filter, currentPage, limit);
    
    // Sort offers
    if (sortFilter === 'oldest') {
      offers = offers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortFilter === 'value-high') {
      offers = offers.sort((a, b) => b.discountValue - a.discountValue);
    } else if (sortFilter === 'value-low') {
      offers = offers.sort((a, b) => a.discountValue - b.discountValue);
    }
    
    // Get categories and analytics
    const [categories, analytics] = await Promise.all([
      getActiveCategories(),
      getOfferAnalytics()
    ]);
    
    return {
      categories,
      analytics,
      offers,
      currentPage,
      totalPages,
      totalOffers,
      limit,
      offerType,
      searchQuery,
      statusFilter,
      sortFilter
    };
  } catch (error) {
    throw error;
  }
};

// Add new offer
export const addOfferService = async (offerData) => {
  try {
    //  offer name already exists 
    const existing = await findOfferByName(offerData.offerName, offerData.offerType);
    
    if (existing) {
      const error = new Error(`An offer with name "${offerData.offerName}" already exists for ${offerData.offerType}s`);
      error.status = 400;
      throw error;
    }
    
    // Create new offer
    const newOffer = await createOffer(offerData);
    return newOffer;
  } catch (error) {
    throw error;
  }
};

// Get offer by ID
export const getOfferByIdService = async (id) => {
  try {
    const offer = await findOfferById(id);
    
    if (!offer) {
      const error = new Error("Offer not found");
      error.status = 404;
      throw error;
    }
    
    return offer;
  } catch (error) {
    throw error;
  }
};

// Edit existing offer
export const editOfferService = async (id, offerData) => {
  try {
    // Check if offer exists
    const offer = await findOfferById(id);
    if (!offer) {
      const error = new Error("Offer not found");
      error.status = 404;
      throw error;
    }
    
    //new name conflicts with another offer
    if (offer.offerName !== offerData.offerName) {
      const existing = await findOfferByName(offerData.offerName, offerData.offerType, id);
      
      if (existing) {
        const error = new Error(`An offer with name "${offerData.offerName}" already exists for ${offerData.offerType}s`);
        error.status = 400;
        throw error;
      }
    }
    
    // Update offer
    const updatedOffer = await updateOffer(id, offerData);
    return updatedOffer;
  } catch (error) {
    throw error;
  }
};

// Toggle offer status
export const toggleOfferStatusService = async (id) => {
  try {
    const offer = await toggleOfferStatusRepo(id);
    
    if (!offer) {
      const error = new Error("Offer not found");
      error.status = 404;
      throw error;
    }
    
    return offer;
  } catch (error) {
    throw error;
  }
};

// Delete offer
export const deleteOfferService = async (id) => {
  try {
    const offer = await findOfferById(id);
    
    if (!offer) {
      const error = new Error("Offer not found");
      error.status = 404;
      throw error;
    }
    
    await deleteOffer(id);
    return true;
  } catch (error) {
    throw error;
  }
};

// Search products for offer creation
export const searchProductsService = async (query) => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const products = await searchProducts(query.trim());
    
    
   
    const formatted = products.map(product => ({
  _id: product._id.toString(),
  name: product.name,
  image: product.images && product.images.length > 0 ? product.images[0] : '/images/placeholder-product.png',
  brand: product.brand?.name || 'Unknown Brand',
  category: product.category?.name || 'Unknown Category'
}));

    
    return formatted;
  } catch (error) {
    console.error('Search Products Service Error:', error);
    throw error;
  }
};