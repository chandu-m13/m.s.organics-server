# Supabase S3 Upload API Guide

This guide explains how to use the file upload API endpoints for uploading files to Supabase S3 storage.

## Table of Contents
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [TypeScript Integration](#typescript-integration)

## Setup

### 1. Install Dependencies

Dependencies are already installed. They include:
- `@aws-sdk/client-s3` - AWS S3 SDK
- `@aws-sdk/s3-request-presigner` - For generating signed URLs
- `multer` - For handling multipart/form-data
- `@types/multer` - TypeScript types for multer

### 2. Environment Variables

Create a `.env` file in the server root with the following variables:

```env
SUPABASE_REGION=us-east-1
SUPABASE_PROJECT_REF=your-project-ref-here
SUPABASE_S3_KEY=your-s3-access-key-here
SUPABASE_S3_SECRET=your-s3-secret-key-here
```

**How to get these values:**

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Storage**
3. Enable S3 compatibility
4. Copy your access key and secret key
5. Your project ref is in your project URL: `https://[project-ref].supabase.co`

## API Endpoints

All endpoints are prefixed with `/api/upload`

### 1. Upload Single File

**POST** `/api/upload/single`

Upload a single file to Supabase S3 storage.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): The file to upload
- `bucket` (text, required): Supabase bucket name (e.g., "products", "avatars")
- `folder` (text, optional): Folder path within the bucket (e.g., "images/products")

**Response:**
```json
{
  "statusCode": 200,
  "message": "File uploaded successfully",
  "data": {
    "fileName": "1697123456789-product-image.jpg",
    "fileUrl": "https://[project-ref].storage.supabase.co/storage/v1/s3/products/1697123456789-product-image.jpg",
    "fileSize": 123456,
    "contentType": "image/jpeg",
    "uploadedAt": "2024-10-12T10:30:45.123Z"
  }
}
```

### 2. Upload Multiple Files

**POST** `/api/upload/multiple`

Upload up to 10 files at once.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `files` (files, required): Array of files to upload (max 10)
- `bucket` (text, required): Supabase bucket name
- `folder` (text, optional): Folder path within the bucket

**Response:**
```json
{
  "statusCode": 200,
  "message": "3 file(s) uploaded successfully",
  "data": [
    {
      "fileName": "1697123456789-image1.jpg",
      "fileUrl": "https://...",
      "fileSize": 123456,
      "contentType": "image/jpeg",
      "uploadedAt": "2024-10-12T10:30:45.123Z"
    },
    // ... more files
  ]
}
```

### 3. Upload Image

**POST** `/api/upload/image`

Upload a single image file (JPEG, PNG, GIF, WebP). Max size: 5MB.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): The image file to upload
- `bucket` (text, required): Supabase bucket name
- `folder` (text, optional): Folder path within the bucket

### 4. Upload Video

**POST** `/api/upload/video`

Upload a single video file (MP4, MPEG, QuickTime). Max size: 100MB.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): The video file to upload
- `bucket` (text, required): Supabase bucket name
- `folder` (text, optional): Folder path within the bucket

### 5. Get Signed URL (for accessing private files)

**POST** `/api/upload/signed-url`

Generate a temporary signed URL for accessing a private file.

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "bucket": "private-files",
  "fileName": "documents/report.pdf",
  "expiresInSeconds": 3600
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Signed URL generated successfully",
  "data": {
    "signedUrl": "https://[project-ref].storage.supabase.co/storage/v1/s3/private-files/documents/report.pdf?...",
    "expiresIn": 3600
  }
}
```

### 6. Get Signed Upload URL (for client-side uploads)

**POST** `/api/upload/signed-upload-url`

Generate a temporary signed URL that clients can use to upload files directly to S3 without going through your server.

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "bucket": "products",
  "fileName": "images/new-product.jpg",
  "contentType": "image/jpeg",
  "expiresInSeconds": 3600
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Signed upload URL generated successfully",
  "data": {
    "signedUrl": "https://[project-ref].storage.supabase.co/storage/v1/s3/products/images/new-product.jpg?...",
    "expiresIn": 3600
  }
}
```

## Usage Examples

### Using cURL

#### Upload a single file:
```bash
curl -X POST http://localhost:3000/api/upload/single \
  -F "file=@/path/to/image.jpg" \
  -F "bucket=products" \
  -F "folder=images"
```

#### Upload multiple files:
```bash
curl -X POST http://localhost:3000/api/upload/multiple \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "bucket=products" \
  -F "folder=gallery"
```

#### Get a signed URL:
```bash
curl -X POST http://localhost:3000/api/upload/signed-url \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "products",
    "fileName": "images/1697123456789-product.jpg",
    "expiresInSeconds": 7200
  }'
```

### Using JavaScript/TypeScript (Fetch API)

#### Upload a single file:
```typescript
async function uploadFile(file: File, bucket: string, folder?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch('http://localhost:3000/api/upload/single', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await uploadFile(file, 'products', 'images');
console.log('Uploaded:', result.data.fileUrl);
```

#### Upload multiple files:
```typescript
async function uploadMultipleFiles(files: File[], bucket: string, folder?: string) {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('bucket', bucket);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch('http://localhost:3000/api/upload/multiple', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

#### Get signed URL:
```typescript
async function getSignedUrl(bucket: string, fileName: string, expiresInSeconds = 3600) {
  const response = await fetch('http://localhost:3000/api/upload/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket,
      fileName,
      expiresInSeconds,
    }),
  });

  const result = await response.json();
  return result.data.signedUrl;
}
```

#### Direct client-side upload using signed URL:
```typescript
async function uploadFileDirectly(file: File, bucket: string, fileName: string) {
  // Step 1: Get signed upload URL from your server
  const urlResponse = await fetch('http://localhost:3000/api/upload/signed-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket,
      fileName,
      contentType: file.type,
      expiresInSeconds: 3600,
    }),
  });

  const { data } = await urlResponse.json();
  const signedUrl = data.signedUrl;

  // Step 2: Upload directly to S3 using the signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (uploadResponse.ok) {
    console.log('File uploaded successfully!');
    return `https://[project-ref].storage.supabase.co/storage/v1/s3/${bucket}/${fileName}`;
  } else {
    throw new Error('Upload failed');
  }
}
```

### Using Axios

```typescript
import axios from 'axios';

async function uploadFile(file: File, bucket: string, folder?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await axios.post(
    'http://localhost:3000/api/upload/single',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}
```

## TypeScript Integration

If you're building a TypeScript client, you can use these interfaces:

```typescript
interface UploadFileResponse {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: Date;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

// Single file upload response
type SingleUploadResponse = ApiResponse<UploadFileResponse>;

// Multiple files upload response
type MultipleUploadResponse = ApiResponse<UploadFileResponse[]>;

// Signed URL response
interface SignedUrlData {
  signedUrl: string;
  expiresIn: number;
}
type SignedUrlResponse = ApiResponse<SignedUrlData>;
```

## File Restrictions

### General Upload (`/single`, `/multiple`)
- **Max file size:** 10MB per file
- **Allowed types:** JPEG, PNG, GIF, WebP, PDF, MP4, MPEG, QuickTime, DOC, DOCX
- **Max files (multiple):** 10 files per request

### Image Upload (`/image`)
- **Max file size:** 5MB
- **Allowed types:** JPEG, PNG, GIF, WebP

### Video Upload (`/video`)
- **Max file size:** 100MB
- **Allowed types:** MP4, MPEG, QuickTime

## Error Handling

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "message": "Error description here"
}
```

Common error codes:
- `400` - Bad Request (missing parameters, invalid file type, etc.)
- `500` - Internal Server Error (upload failed, S3 configuration error)

Example error handling:

```typescript
try {
  const result = await uploadFile(file, 'products');
  console.log('Success:', result);
} catch (error) {
  if (error.response) {
    console.error('Upload failed:', error.response.data.message);
  } else {
    console.error('Network error:', error.message);
  }
}
```

## Security Best Practices

1. **Bucket Permissions:** Configure your Supabase buckets with appropriate permissions
2. **File Validation:** The API validates file types, but always validate on the client side too
3. **Size Limits:** Adjust the size limits in `upload.middleware.ts` based on your needs
4. **Signed URLs:** Use signed URLs with short expiration times for private content
5. **Authentication:** Consider adding authentication middleware to protect upload endpoints

## Customization

### Changing File Size Limits

Edit `/server/src/middleware/upload.middleware.ts`:

```typescript
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Change to 20MB
  },
});
```

### Adding More File Types

Edit the `fileFilter` function in `/server/src/middleware/upload.middleware.ts`:

```typescript
const allowedMimeTypes = [
  // ... existing types
  "application/zip",
  "text/csv",
  // Add more types here
];
```

### Custom File Naming

Edit `/server/src/services/upload.service.ts` in the `uploadFile` method to customize file naming logic.

## Troubleshooting

### "Missing required Supabase environment variables" error
- Ensure all environment variables are set in your `.env` file
- Restart your server after adding environment variables

### "File type not allowed" error
- Check that your file type is in the allowed list
- Check the file's MIME type matches what's expected

### Upload succeeds but file not accessible
- Check your Supabase bucket permissions
- Verify the bucket is set to public if you want public access
- Use signed URLs for private buckets

### "Request entity too large" error
- The file exceeds the size limit
- Increase the limit in `upload.middleware.ts` or compress your file

## Support

For issues or questions, please refer to:
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

