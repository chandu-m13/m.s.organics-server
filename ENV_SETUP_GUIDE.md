# 🔧 Environment Setup Guide

## Quick Fix for Database Connection Error

You're getting this error:
```
Can't reach database server at `db.abtlrkuzlvrfsetocnuj.supabase.co:5432`
```

This means your `.env` file is missing or misconfigured.

---

## Step 1: Create `.env` File

In the `/server` directory, create a file named `.env` with the following content:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# Option 1: Connection Pooling (Recommended for serverless/production)
DATABASE_URL="postgresql://postgres.abtlrkuzlvrfsetocnuj:[YOUR_DB_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Option 2: Direct Connection (Use if pooling doesn't work)
# DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.abtlrkuzlvrfsetocnuj.supabase.co:5432/postgres"

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# SUPABASE S3 STORAGE CONFIGURATION
# ============================================
SUPABASE_URL=https://abtlrkuzlvrfsetocnuj.supabase.co
SUPABASE_S3_KEY_ID=your-s3-access-key-id-here
SUPABASE_S3_SECRET=your-s3-secret-key-here
SUPABASE_BUCKET=Product Images
SUPABASE_REGION=ap-south-1

# ============================================
# OPTIONAL: JWT & AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# ============================================
# OPTIONAL: EMAIL CONFIGURATION
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# ============================================
# CORS CONFIGURATION
# ============================================
FRONTEND_URL=http://localhost:5173
```

---

## Step 2: Get Your Credentials from Supabase

### A. Get Database Password

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `abtlrkuzlvrfsetocnuj`
3. Go to **Settings** → **Database**
4. Scroll to **Connection String** section
5. Click **"URI"** tab
6. Copy the connection string
7. Replace `[YOUR_DB_PASSWORD]` with your actual database password

**Example:**
```
From: postgresql://postgres.abtlrkuzlvrfsetocnuj:[YOUR-PASSWORD]@...
To:   postgresql://postgres.abtlrkuzlvrfsetocnuj:MySecurePass123@...
```

### B. Get S3 Credentials

1. In Supabase Dashboard, go to **Settings** → **Storage**
2. Scroll to **S3 Access Keys** section
3. Click **"Create new key"** (if you don't have one)
4. Copy the **Access Key ID** → Put in `SUPABASE_S3_KEY_ID`
5. Copy the **Secret Access Key** → Put in `SUPABASE_S3_SECRET`
6. ⚠️ **Save the secret immediately** - it won't be shown again!

---

## Step 3: Verify Your Configuration

### Test Database Connection

```bash
cd /Users/rakeshreddy/learning/telugu-vermi-farms/server

# Test Prisma connection
npx prisma db pull
```

**If successful:** You'll see "Introspected 11 models"

**If failed:** Check your DATABASE_URL

### Test S3 Connection

Create a simple test file:

```bash
# In server directory
node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'ap-south-1',
  endpoint: 'https://abtlrkuzlvrfsetocnuj.supabase.co',
  credentials: {
    accessKeyId: 'YOUR_KEY_ID',
    secretAccessKey: 'YOUR_SECRET'
  }
});
client.send(new ListBucketsCommand({})).then(console.log).catch(console.error);
"
```

---

## Step 4: Restart Your Server

After creating/updating `.env`:

```bash
cd /Users/rakeshreddy/learning/telugu-vermi-farms/server

# Stop the server (Ctrl+C if running)

# Start the server
npm run dev
```

---

## Common Issues & Solutions

### Issue 1: "Can't reach database server"

**Solutions:**
1. **Check DATABASE_URL format** - Must include password
2. **Try direct connection** instead of pooling:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.abtlrkuzlvrfsetocnuj.supabase.co:5432/postgres"
   ```
3. **Check if database is paused** - Go to Supabase dashboard and wake it up
4. **Verify password** - Reset if needed in Supabase Settings → Database

### Issue 2: "Access Denied" for S3

**Solutions:**
1. **Verify S3 credentials** are correct
2. **Create new S3 access key** in Supabase Settings → Storage
3. **Check bucket name** - Must match exactly (case-sensitive)
4. **Verify bucket exists** in Supabase Storage

### Issue 3: Environment variables not loading

**Solutions:**
1. **Ensure `.env` is in `/server` directory** (not root)
2. **Restart server** after changing .env
3. **Check for syntax errors** in .env (no quotes around values with special chars)

---

## Quick Setup Script

Create this file to quickly check your setup:

**File: `server/check-env.ts`**

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking Environment Variables...\n');

const required = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_S3_KEY_ID',
  'SUPABASE_S3_SECRET',
  'SUPABASE_BUCKET'
];

let allPresent = true;

required.forEach(key => {
  const value = process.env[key];
  if (value) {
    const masked = key.includes('SECRET') || key.includes('PASSWORD') 
      ? '***' + value.slice(-4)
      : value.slice(0, 50) + (value.length > 50 ? '...' : '');
    console.log(`✅ ${key}: ${masked}`);
  } else {
    console.log(`❌ ${key}: MISSING`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('\n✅ All required environment variables are set!');
} else {
  console.log('\n❌ Some environment variables are missing. Please check your .env file.');
}
```

**Run it:**
```bash
npx ts-node server/check-env.ts
```

---

## Template `.env` File

**Create:** `/Users/rakeshreddy/learning/telugu-vermi-farms/server/.env`

**Copy this template and fill in your values:**

```env
DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.abtlrkuzlvrfsetocnuj.supabase.co:5432/postgres"
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://abtlrkuzlvrfsetocnuj.supabase.co
SUPABASE_S3_KEY_ID=your-s3-access-key-id-here
SUPABASE_S3_SECRET=your-s3-secret-key-here
SUPABASE_BUCKET=Product Images
SUPABASE_REGION=ap-south-1
FRONTEND_URL=http://localhost:5173
```

---

## Next Steps

1. **Create `.env` file** in `/server` directory
2. **Fill in your Supabase credentials** (database password, S3 keys)
3. **Restart your server**
4. **Test the endpoint:**
   ```bash
   curl http://localhost:3000/api/product/1/image
   ```

Need help getting your credentials? Let me know which step you're stuck on!

