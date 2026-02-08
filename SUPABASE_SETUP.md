# Supabase S3 Storage Setup Guide

## Environment Variables Required

Add these variables to your `.env` file:

```env
# Supabase S3 Storage Configuration
SUPABASE_REGION=ap-south-1
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_S3_KEY_ID=your-s3-access-key-id-here
SUPABASE_S3_SECRET=your-s3-secret-key-here
SUPABASE_BUCKET=products
```

## How to Get Your Supabase S3 Credentials

### Step 1: Access Your Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### Step 2: Enable S3 Compatibility
1. Navigate to **Settings** in the left sidebar
2. Click on **Storage**
3. Scroll to **S3 Access Keys** section
4. Click **"Create new key"** or use existing keys

### Step 3: Get Your Project URL
Your project URL is in your Supabase dashboard:
- URL format: `https://[PROJECT_REF].supabase.co`
- Example: `https://abtlrkuzlvrfsetocnuj.supabase.co`
- This complete URL is your `SUPABASE_URL`

### Step 4: Get Your S3 Credentials
1. In the **Storage Settings** page, under **S3 Access Keys**
2. Copy the **Access Key ID** → This is your `SUPABASE_S3_KEY_ID`
3. Copy the **Secret Access Key** → This is your `SUPABASE_S3_SECRET`
4. **Important:** Save the secret key immediately as it won't be shown again

### Step 5: Set the Region
- Most Supabase projects use `ap-south-1` (Asia Pacific - Mumbai)
- Or check your project's region in **Settings** → **General** → **Region**
- Set this as your `SUPABASE_REGION`

### Step 6: Set Your Default Bucket
- Set `SUPABASE_BUCKET` to your primary storage bucket name (e.g., "products")
- This will be used as the default bucket for product image uploads

## Example Configuration

```env
SUPABASE_REGION=ap-south-1
SUPABASE_URL=https://abtlrkuzlvrfsetocnuj.supabase.co
SUPABASE_S3_KEY_ID=abc123def456ghi789jkl
SUPABASE_S3_SECRET=xyz789uvw012rst345mno678pqr
SUPABASE_BUCKET=products
```

## Create Storage Buckets

Before uploading files, you need to create buckets in Supabase:

1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Enter a bucket name (e.g., "products", "avatars", "videos")
4. Choose **Public** or **Private**:
   - **Public**: Files are accessible via public URLs
   - **Private**: Files require signed URLs for access
5. Click **"Create bucket"**

### Recommended Buckets for This Project

Based on your project structure, consider creating:
- `products` - For product images
- `videos` - For video content
- `documents` - For PDF files and documents
- `avatars` - For user profile images (if needed)

## Bucket Permissions

### For Public Buckets
Configure policies to allow public read access:

1. Go to **Storage** → Select your bucket
2. Click **"Policies"**
3. Add a policy for public read:
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'your-bucket-name' );
   ```

### For Private Buckets
Use signed URLs from the API to grant temporary access.

## Testing Your Setup

### 1. Test with cURL

```bash
# Replace with your actual file path
curl -X POST http://localhost:3000/api/upload/single \
  -F "file=@./test-image.jpg" \
  -F "bucket=products" \
  -F "folder=test"
```

### 2. Expected Response

```json
{
  "statusCode": 200,
  "message": "File uploaded successfully",
  "data": {
    "fileName": "test/1697123456789-test-image.jpg",
    "fileUrl": "https://your-project-ref.storage.supabase.co/storage/v1/s3/products/test/1697123456789-test-image.jpg",
    "fileSize": 123456,
    "contentType": "image/jpeg",
    "uploadedAt": "2024-10-12T10:30:45.123Z"
  }
}
```

## Troubleshooting

### Error: "Missing required Supabase environment variables"
- Check that all 5 environment variables are set in `.env`
- Restart your server after adding environment variables
- Make sure there are no typos in variable names

### Error: "Access Denied" or "Invalid Credentials"
- Verify your `SUPABASE_S3_KEY_ID` and `SUPABASE_S3_SECRET` are correct
- Make sure the S3 access keys are enabled in Supabase
- Try regenerating the keys in Supabase if they're old

### Error: "No such bucket"
- The bucket name in your request doesn't exist
- Create the bucket in Supabase Storage first
- Bucket names are case-sensitive

### Files Upload Successfully but Can't Access Them
- Check if the bucket is set to **Public** in Supabase
- For private buckets, use the `/api/upload/signed-url` endpoint
- Verify bucket policies allow the type of access you need

### Files Are Too Large
- Adjust limits in `/server/src/middleware/upload.middleware.ts`
- Consider upgrading your Supabase plan for larger storage
- Compress images/videos before uploading

## Security Considerations

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Rotate keys regularly** - Generate new S3 access keys periodically
3. **Use appropriate bucket permissions** - Don't make everything public
4. **Validate file types** - The API already validates, but add client-side validation too
5. **Consider authentication** - Add auth middleware to protect upload endpoints
6. **Set file size limits** - Prevent abuse by limiting upload sizes
7. **Use signed URLs for private content** - Don't expose private files publicly

## Next Steps

1. ✅ Add environment variables to `.env`
2. ✅ Create necessary buckets in Supabase
3. ✅ Configure bucket policies
4. ✅ Test uploads with the API
5. ✅ Integrate with your frontend application

For API usage examples, see [UPLOAD_API_GUIDE.md](./UPLOAD_API_GUIDE.md)

