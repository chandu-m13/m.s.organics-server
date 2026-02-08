# Quick Start - File Upload System

## 🚀 What Was Created

A complete file upload system for Supabase S3 storage following your server's clean architecture.

### File Structure

```
server/src/
├── utils/
│   └── supabase-s3-uploader.ts      # S3 client and upload logic
├── interfaces/
│   └── Upload.interface.ts          # TypeScript interfaces
├── services/
│   └── upload.service.ts            # Business logic
├── controllers/
│   └── upload.controller.ts         # Request handlers
├── middleware/
│   └── upload.middleware.ts         # Multer configuration
└── routes/
    └── upload.routes.ts             # API routes
```

## ⚡ Quick Setup (3 Steps)

### 1. Add Environment Variables

Create/update your `.env` file:

```env
SUPABASE_REGION=ap-south-1
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_S3_KEY_ID=your-s3-key-id
SUPABASE_S3_SECRET=your-s3-secret
SUPABASE_BUCKET=products
```

📖 **Need help?** See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

### 2. Create a Bucket in Supabase

1. Go to Supabase Dashboard → Storage
2. Create a new bucket (e.g., "products")
3. Set it as Public or Private

### 3. Start Your Server

```bash
npm run dev
```

## 🎯 Test It Now

```bash
# Upload a file (replace with your actual file path)
curl -X POST http://localhost:3000/api/upload/single \
  -F "file=@./test-image.jpg" \
  -F "bucket=products"
```

**Success Response:**
```json
{
  "statusCode": 200,
  "message": "File uploaded successfully",
  "data": {
    "fileName": "1697123456789-test-image.jpg",
    "fileUrl": "https://[your-project].storage.supabase.co/storage/v1/s3/products/...",
    "fileSize": 123456,
    "contentType": "image/jpeg",
    "uploadedAt": "2024-10-12T10:30:45.123Z"
  }
}
```

## 📡 Available Endpoints

All endpoints are at `http://localhost:3000/api/upload`

| Endpoint | Method | Purpose | Max Size |
|----------|--------|---------|----------|
| `/single` | POST | Upload single file | 10MB |
| `/multiple` | POST | Upload multiple files (max 10) | 10MB each |
| `/image` | POST | Upload single image | 5MB |
| `/video` | POST | Upload single video | 100MB |
| `/signed-url` | POST | Get URL for private file | N/A |
| `/signed-upload-url` | POST | Get URL for client upload | N/A |

## 💡 Common Use Cases

### Upload Product Image

```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('bucket', 'products');
formData.append('folder', 'images');

const response = await fetch('http://localhost:3000/api/upload/image', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log('Image URL:', result.data.fileUrl);
```

### Upload Multiple Gallery Images

```typescript
const formData = new FormData();
images.forEach(img => formData.append('files', img));
formData.append('bucket', 'products');
formData.append('folder', 'gallery');

const response = await fetch('http://localhost:3000/api/upload/multiple', {
  method: 'POST',
  body: formData,
});
```

### Get Signed URL for Private File

```typescript
const response = await fetch('http://localhost:3000/api/upload/signed-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bucket: 'private-files',
    fileName: 'documents/invoice.pdf',
    expiresInSeconds: 3600
  }),
});

const { data } = await response.json();
window.open(data.signedUrl); // Opens the private file
```

## 🎨 Frontend Integration Example

### React Component

```tsx
import { useState } from 'react';

function ProductImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'products');
    formData.append('folder', 'images');

    try {
      const response = await fetch('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setImageUrl(result.data.fileUrl);
      alert('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {uploading && <p>Uploading...</p>}
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
}
```

## 🛠️ Customization

### Change File Size Limits

Edit `server/src/middleware/upload.middleware.ts`:

```typescript
limits: {
  fileSize: 20 * 1024 * 1024, // Change to 20MB
}
```

### Add More Allowed File Types

Edit `server/src/middleware/upload.middleware.ts`:

```typescript
const allowedMimeTypes = [
  // ... existing types
  "application/zip",
  "text/csv",
];
```

### Custom File Naming

Edit `server/src/services/upload.service.ts` in `uploadFile()` method.

## 📚 Full Documentation

- **Setup Guide:** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- **API Reference:** [UPLOAD_API_GUIDE.md](./UPLOAD_API_GUIDE.md)

## ✅ Features Included

- ✅ Single & multiple file uploads
- ✅ Image-specific endpoint (JPEG, PNG, GIF, WebP)
- ✅ Video-specific endpoint (MP4, MPEG, MOV)
- ✅ File type validation
- ✅ File size limits
- ✅ Automatic unique filenames (timestamp-based)
- ✅ Folder organization support
- ✅ Signed URLs for private files
- ✅ Client-side upload support (signed upload URLs)
- ✅ Full TypeScript support
- ✅ Error handling
- ✅ Clean architecture following your patterns

## 🔒 Security Notes

- Add authentication middleware to protect endpoints
- Configure proper bucket policies in Supabase
- Never commit `.env` file
- Validate file types on both client and server
- Use signed URLs for sensitive content

## 🆘 Troubleshooting

**"Missing environment variables"**
→ Add all 4 variables to `.env` and restart server

**"No such bucket"**
→ Create the bucket in Supabase Dashboard first

**"File type not allowed"**
→ Check allowed types in `upload.middleware.ts`

**"Request entity too large"**
→ File exceeds size limit, increase limit or compress file

---

🎉 **You're all set!** The upload system is ready to use.

Need help? Check the detailed guides linked above.

