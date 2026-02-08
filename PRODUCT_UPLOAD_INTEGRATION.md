# Product Upload Integration Guide

## Overview

The product management system has been integrated with Supabase S3 storage to handle image uploads automatically. When creating or updating a product, images are now uploaded to S3 and stored in the database.

## What Changed

### 1. **Routes** (`src/routes/product.routes.ts`)
- Added `imageUpload` middleware to handle file uploads
- Applied to both `POST /` (create) and `PUT /:id` (update) routes

### 2. **Controller** (`src/controllers/product.controller.ts`)
- Now extracts `imageFile` from `req.file` (provided by multer)
- Removed `image_name` and `image_source_url` from request body
- Added proper type parsing for `price_per_kg` and `is_active`

### 3. **Service** (`src/services/product.service.ts`)
- Automatically uploads images to Supabase S3 before creating/updating products
- Generates unique filenames with timestamps
- Stores files in `products/` folder within the bucket
- Creates/updates image records in database with S3 URLs

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Required for S3 upload
SUPABASE_REGION=ap-south-1
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_S3_KEY_ID=your-s3-key-id
SUPABASE_S3_SECRET=your-s3-secret
SUPABASE_BUCKET=products
```

## API Changes

### Create Product

**Endpoint:** `POST /api/product`

**Before:**
```json
{
  "name": "Product Name",
  "description": "Description",
  "image_name": "image.jpg",
  "image_source_url": "https://...",
  "price_per_kg": 100
}
```

**After (multipart/form-data):**
```
name: "Product Name"
description: "Description"
image: [File]
price_per_kg: 100
```

### Update Product

**Endpoint:** `PUT /api/product/:id`

**Before:**
```json
{
  "name": "Updated Name",
  "description": "Updated Description",
  "image_name": "new-image.jpg",
  "image_source_url": "https://...",
  "price_per_kg": 150,
  "is_active": true
}
```

**After (multipart/form-data):**
```
name: "Updated Name"
description: "Updated Description"
image: [File] (optional)
price_per_kg: 150
is_active: true
```

**Note:** Image is optional when updating. If not provided, the existing image is kept.

## Frontend Integration

Your existing frontend (`ProductManagement.tsx`) already works correctly! It's already sending data as `multipart/form-data` with the `image` field.

### Current Frontend Code (Already Compatible)

```typescript
// Creating/Updating a product
const fd = new FormData();
fd.append('name', form.name.trim());
fd.append('description', form.description.trim());
fd.append('price_per_kg', String(form.price_per_kg));
if (form.imageFile) fd.append('image', form.imageFile);

if (form.id) {
  // Update
  await axios.put(`${API_BASE_URL}/product/${form.id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
} else {
  // Create
  await axios.post(`${API_BASE_URL}/product`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
```

## How It Works

### Create Flow

1. User selects an image in the frontend
2. Frontend sends `multipart/form-data` with image file
3. Multer middleware extracts the file → `req.file`
4. Controller passes file to service
5. Service uploads image to Supabase S3:
   - Generates unique filename: `products/1697123456789-image.jpg`
   - Uploads to bucket specified in `SUPABASE_BUCKET`
   - Gets back public URL
6. Service creates image record in database with URL
7. Service creates product linked to image
8. Returns product with image data

### Update Flow

1. If user selects a new image:
   - Same upload process as create
   - Updates existing image record with new URL
2. If no image provided:
   - Keeps existing image
   - Only updates product fields

## File Storage Structure

Files are stored in Supabase with this structure:

```
bucket: [SUPABASE_BUCKET] (e.g., "products")
  └── products/
      ├── 1697123456789-product-image-1.jpg
      ├── 1697123456790-product-image-2.png
      └── ...
```

## Image Validation

The `imageUpload` middleware automatically validates:

- **Allowed types:** JPEG, JPG, PNG, GIF, WebP
- **Max size:** 5MB per image
- **Any other type:** Returns 400 error

## Example cURL Requests

### Create Product with Image

```bash
curl -X POST http://localhost:3000/api/product \
  -F "name=Organic Compost" \
  -F "description=High quality organic compost for farming" \
  -F "price_per_kg=50" \
  -F "image=@/path/to/compost-image.jpg"
```

### Update Product with New Image

```bash
curl -X PUT http://localhost:3000/api/product/1 \
  -F "name=Premium Organic Compost" \
  -F "description=Updated description" \
  -F "price_per_kg=75" \
  -F "image=@/path/to/new-image.jpg"
```

### Update Product without Changing Image

```bash
curl -X PUT http://localhost:3000/api/product/1 \
  -F "name=Premium Organic Compost" \
  -F "price_per_kg=75"
```

## Response Format

Both create and update return the same format:

```json
{
  "statusCode": 200,
  "message": "Product created successfully",
  "data": {
    "id": 1,
    "name": "Organic Compost",
    "description": "High quality organic compost",
    "price_per_kg": 50,
    "is_active": true,
    "fk_id_image": 1,
    "image": {
      "id": 1,
      "name": "compost-image.jpg",
      "source_url": "https://[project-ref].storage.supabase.co/storage/v1/s3/products/products/1697123456789-compost-image.jpg"
    }
  }
}
```

## Error Handling

### Common Errors

**Missing image on create:**
```json
{
  "statusCode": 400,
  "message": "Product image is required"
}
```

**Invalid file type:**
```json
{
  "statusCode": 400,
  "message": "Only image files are allowed. Received: application/pdf"
}
```

**File too large:**
```json
{
  "statusCode": 400,
  "message": "File size exceeds limit"
}
```

**S3 upload failed:**
```json
{
  "statusCode": 500,
  "message": "Failed to upload file: [error details]"
}
```

## Testing Checklist

- [ ] Set all environment variables in `.env`
- [ ] Create `products` bucket in Supabase (or set `SUPABASE_BUCKET` to existing bucket)
- [ ] Set bucket to **Public** in Supabase
- [ ] Test creating a product with an image
- [ ] Verify image URL is accessible
- [ ] Test updating a product with a new image
- [ ] Test updating a product without changing image
- [ ] Verify old vs new image URLs in database

## Troubleshooting

### "Missing required Supabase environment variables"
- Ensure all 5 variables are in `.env`
- Restart your server after adding them

### "No such bucket: products"
- Create the bucket in Supabase Dashboard → Storage
- Or change `SUPABASE_BUCKET` to an existing bucket name

### Image uploads but URL returns 404
- Make sure the bucket is set to **Public** in Supabase
- Check bucket policies allow public read access

### "Product image is required" when creating product
- Make sure the form field name is `image` (matches multer config)
- Check that file is actually being sent in request

### Images work locally but not in production
- Verify environment variables are set in production
- Check Supabase project allows connections from production server
- Verify bucket policies in production Supabase project

## Benefits of This Integration

✅ **Automatic Upload** - No manual S3 upload needed  
✅ **Type Validation** - Only images allowed  
✅ **Size Limits** - Prevents oversized uploads  
✅ **Unique Filenames** - No collision issues  
✅ **Clean URLs** - Direct S3 URLs stored in database  
✅ **Error Handling** - Clear error messages  
✅ **Backward Compatible** - Frontend already works!

## Next Steps

1. Configure your `.env` file with Supabase credentials
2. Create the `products` bucket in Supabase
3. Set bucket to Public
4. Test with your existing frontend - it should work immediately!
5. Monitor logs for any upload errors

For more details on the S3 system, see:
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Setup instructions
- [UPLOAD_API_GUIDE.md](./UPLOAD_API_GUIDE.md) - Full upload API reference

