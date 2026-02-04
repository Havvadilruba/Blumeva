# Cloudinary Image Upload Troubleshooting

## The Problem
Image uploads work on **localhost** but fail on **hosted environments** with a server error.

## Root Causes Fixed

### 1. **Environment Variables Not Loaded**
- **Issue**: `dotenv.config()` was being called in `cloudinary.js` instead of globally
- **Fix**: Moved `dotenv.config()` to `server.js` at the very top
- **Why**: Ensures all env vars are loaded before any module tries to use them

### 2. **No Error Handling for Upload Failures**
- **Issue**: Cloudinary errors weren't being caught properly
- **Fix**: Added `multerErrorHandler` middleware to catch and report upload errors
- **Why**: Helps identify the exact issue (file size, format, Cloudinary credentials)

### 3. **Missing File Validation**
- **Issue**: No proper error messages for invalid uploads
- **Fix**: Added file size limits (10MB) and better validation
- **Why**: Hosted servers often have stricter limits

## Deployment Checklist

### ✅ Before Deploying to Hosting

1. **Set Environment Variables on Your Hosting Platform**
   - `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY` - Your Cloudinary API key
   - `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
   - `MONGODB_URI` - Your MongoDB connection string
   - `SESSION_SECRET` - A secure random string

   **Example (for Render, Heroku, etc.):**
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. **Verify Cloudinary Configuration**
   ```bash
   # Test locally first
   node -e "require('dotenv').config(); console.log(process.env.CLOUDINARY_CLOUD_NAME)"
   ```

3. **Check File Upload Limits**
   - Your hosting platform may have request size limits
   - Cloudinary has a 10MB limit per image by default
   - Ensure `express.json` and `express.urlencoded` limits are set (already 50MB)

4. **Network/Firewall Issues**
   - Ensure your hosting can reach Cloudinary API
   - Check if firewall is blocking outbound requests to Cloudinary

## Testing Image Upload

### Local Testing
```bash
# Start server
npm start

# Go to admin dashboard
# Navigate to Products > Add Product
# Select 3+ images and upload
```

### Hosted Testing
If upload fails on hosted:

1. **Check Server Logs** for error messages like:
   - `Cloudinary environment variables are not set!`
   - `Invalid image format`
   - `File size too large`
   - Network timeout errors

2. **Verify Cloudinary Credentials**
   - Login to Cloudinary dashboard
   - Confirm API keys haven't been regenerated
   - Check if keys match environment variables

3. **Test Text-Only Operations**
   - If text editing works but images fail, it's definitely Cloudinary-related

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Cloudinary environment variables are not set!` | Missing env vars on hosting | Add Cloudinary credentials to hosting platform settings |
| `Invalid image format` | Wrong file type uploaded | Ensure uploading JPEG, PNG, WebP, AVIF, GIF |
| `File size too large` | Image exceeds 10MB | Compress images before uploading |
| `ECONNREFUSED` / `ETIMEDOUT` | Can't reach Cloudinary | Check firewall, network, Cloudinary API status |
| `Unauthorized` | Invalid Cloudinary credentials | Verify API key and secret are correct |

## Code Changes Made

1. **server.js** - Moved `dotenv.config()` to top
2. **config/cloudinary.js** - Removed redundant dotenv, added warnings
3. **middlewares/multer.js** - Added error handler and file size validation
4. **controller/admin/productController.js** - Better error messages

## Next Steps

1. Deploy code to hosting
2. Add Cloudinary environment variables to hosting dashboard
3. Test image upload again
4. Check hosting platform logs if still failing
5. Verify Cloudinary account is active and API keys are valid
