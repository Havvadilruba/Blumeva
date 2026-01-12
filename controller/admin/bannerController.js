import { createBannerSchema, updateBannerSchema } from "../../validations/bannerValidation.js";
import {
  createBannerService,
  getAllBannersService,
  getBannerByIdService, 
  updateBannerService,
  deleteBannerService,
  toggleBannerStatusService
} from "../../services/bannerService.js";

// Load banners page
export const loadBanners = async (req, res) => {
  try {
    const banners = await getAllBannersService();
    res.render("admin/banners", { 
      layout: "layouts/admin",
      title: "Banners",
      activePage: "banners",
      pageCSS: "banners",
      banners 
    });
  } catch (error) {
    console.error('Error loading banners:', error);
    res.status(500).render("error", { message: "Failed to load banners" });
  }
};


export const getBanner = async (req, res) => {
  try {
    const banner = await getBannerByIdService(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    
    res.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ message: error.message || "Failed to fetch banner" });
  }
};

// Add banner
export const addBanner = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

 
    if (!req.file) {
      return res.status(400).json({
        message: "Banner image is required"
      });
    }


    const { bannerId, ...cleanBody } = req.body;

    const formData = {
      ...cleanBody,
      isActive: cleanBody.isActive === 'true' || cleanBody.isActive === true
    };


    Object.keys(formData).forEach(key => {
      if (formData[key] === '' || formData[key] === undefined || formData[key] === null) {
        delete formData[key];
      }
    });

    console.log("Cleaned form data:", formData);


    const { error, value } = createBannerSchema.validate(formData, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      console.log("Validation errors:", error.details);
      return res.status(400).json({
        message: "Validation error",
        errors: error.details.map(err => err.message)
      });
    }

    console.log("Validated data:", value);

   
    const newBanner = await createBannerService({
      ...value,
      image: req.file.path 
    });

    console.log("Banner created:", newBanner);

    res.status(201).json({ 
      message: "Banner created successfully",
      banner: newBanner
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ 
      message: error.message || "Failed to create banner" 
    });
  }
};

// Update banner
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("UPDATE - BODY:", req.body);
    console.log("UPDATE - FILE:", req.file);


    const { bannerId, ...updateData } = req.body;

 
    const formData = {
      ...updateData,
      isActive: updateData.isActive === 'true' || updateData.isActive === true
    };

    Object.keys(formData).forEach(key => {
      if (formData[key] === '' || formData[key] === undefined) {
        delete formData[key];
      }
    });
    const { error, value } = updateBannerSchema.validate(formData, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.details.map(err => err.message)
      });
    }

    if (Object.keys(value).length === 0 && !req.file) {
      return res.status(400).json({
        message: "At least one field must be updated"
      });
    }

    if (value.startDate && value.endDate) {
      if (new Date(value.endDate) <= new Date(value.startDate)) {
        return res.status(400).json({
          message: "End date must be after start date"
        });
      }
    }

    if (req.file) {
      value.image = req.file.path;
      console.log("New image uploaded:", req.file.path);
    }

    console.log("Final update data:", value);

    // Update banner
    const banner = await updateBannerService(id, value);

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner updated successfully",
      banner
    });
  } catch (err) {
    console.error("Update banner error:", err);
    res.status(500).json({ 
      message: err.message || "Failed to update banner" 
    });
  }
};

// Delete banner
export const deleteBanner = async (req, res) => {
  try {
    await deleteBannerService(req.params.id);
    
    res.status(200).json({ 
      message: "Banner deleted successfully" 
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ 
      message: "Failed to delete banner" 
    });
  }
};

// Toggle banner status
export const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await toggleBannerStatusService(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    
    res.status(200).json({ 
      message: "Banner status updated successfully",
      isActive: banner.isActive
    });
  } catch (error) {
    console.error('Error toggling banner status:', error);
    res.status(500).json({ 
      message: error.message || "Failed to update banner status" 
    });
  }
};

export default {
  loadBanners,
  getBanner,
  addBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus
};