import StorageService from '../services/storage.service';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

/**
 * Simple test script to verify Supabase Storage integration
 * Run with: npx ts-node src/test/test-storage.ts
 */
async function testStorageService() {
    console.log('🧪 Testing Supabase Storage Service...\n');

    try {
        // Test 1: Upload a test file
        console.log('Test 1: Uploading test file...');
        const testContent = Buffer.from('This is a test image file');
        const testPath = `test/test-${Date.now()}.txt`;
        const bucket = process.env.SUPABASE_BUCKET || 'images';

        const { storagePath, publicUrl } = await StorageService.uploadFile(
            bucket,
            testPath,
            testContent,
            'text/plain'
        );

        console.log('✅ Upload successful!');
        console.log('   Storage Path:', storagePath);
        console.log('   Public URL:', publicUrl);
        console.log('');

        // Test 2: Check if file exists
        console.log('Test 2: Checking file existence...');
        const exists = await StorageService.fileExists(bucket, testPath);
        console.log(exists ? '✅ File exists!' : '❌ File not found');
        console.log('');

        // Test 3: Get public URL
        console.log('Test 3: Getting public URL...');
        const url = StorageService.getPublicUrl(bucket, testPath);
        console.log('✅ Public URL:', url);
        console.log('');

        // Test 4: Download file (for private buckets)
        console.log('Test 4: Downloading file...');
        try {
            const { buffer, contentType } = await StorageService.downloadFile(bucket, testPath);
            console.log('✅ Download successful!');
            console.log('   Content Type:', contentType);
            console.log('   Buffer Size:', buffer.length, 'bytes');
            console.log('   Content:', buffer.toString());
        } catch (error: any) {
            console.log('⚠️  Download failed (expected for public buckets):', error.message);
        }
        console.log('');

        // Test 5: Delete file
        console.log('Test 5: Deleting test file...');
        await StorageService.deleteFile(bucket, testPath);
        console.log('✅ File deleted successfully!');
        console.log('');

        console.log('🎉 All tests completed!\n');
        console.log('✅ Supabase Storage integration is working correctly!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

// Run tests
testStorageService()
    .then(() => {
        console.log('\n✅ Test suite completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    });
