import { supabase } from '../config/supabase';
import RestError from '../utils/rest-error';
import HttpStatusCodes from '../utils/HTTP_STATUS_CODES';

/**
 * Storage service for Supabase Storage operations
 */
const StorageService = {
    /**
     * Upload a file to Supabase Storage
     * @param bucket - Bucket name
     * @param path - File path in the bucket (e.g., 'products/image.jpg')
     * @param file - File buffer or File object
     * @param contentType - MIME type of the file
     * @returns Storage path and public URL
     */
    async uploadFile(
        bucket: string,
        path: string,
        file: Buffer | File,
        contentType?: string
    ): Promise<{ storagePath: string; publicUrl: string | null }> {
        try {
            console.log(`Uploading file to Supabase: bucket=${bucket}, path=${path}`);

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    contentType,
                    upsert: true, // Overwrite if file exists
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw new RestError(
                    HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to upload file: ${error.message}`
                );
            }

            console.log('File uploaded successfully:', data.path);

            // Get public URL if bucket is public
            const publicUrl = this.getPublicUrl(bucket, path);

            return {
                storagePath: data.path,
                publicUrl,
            };
        } catch (error: any) {
            console.error('Error uploading file to Supabase:', error);
            throw error instanceof RestError
                ? error
                : new RestError(
                    HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to upload file to storage'
                );
        }
    },

    /**
     * Delete a file from Supabase Storage
     * @param bucket - Bucket name
     * @param path - File path in the bucket
     */
    async deleteFile(bucket: string, path: string): Promise<void> {
        try {
            console.log(`Deleting file from Supabase: bucket=${bucket}, path=${path}`);

            const { error } = await supabase.storage.from(bucket).remove([path]);

            if (error) {
                console.error('Supabase delete error:', error);
                // Don't throw error if file doesn't exist
                if (error.message.includes('not found')) {
                    console.log('File not found, skipping deletion');
                    return;
                }
                throw new RestError(
                    HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    `Failed to delete file: ${error.message}`
                );
            }

            console.log('File deleted successfully');
        } catch (error: any) {
            console.error('Error deleting file from Supabase:', error);
            // Log error but don't throw to prevent blocking other operations
            if (!(error.message && error.message.includes('not found'))) {
                console.warn('Failed to delete file, but continuing:', error.message);
            }
        }
    },

    /**
     * Get public URL for a file (works only for public buckets)
     * @param bucket - Bucket name
     * @param path - File path in the bucket
     * @returns Public URL or null if bucket is private
     */
    getPublicUrl(bucket: string, path: string): string | null {
        try {
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            return data.publicUrl;
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    },

    /**
     * Download a file from Supabase Storage (for private buckets)
     * @param bucket - Bucket name
     * @param path - File path in the bucket
     * @returns Buffer and content type
     */
    async downloadFile(
        bucket: string,
        path: string
    ): Promise<{ buffer: Buffer; contentType: string }> {
        try {
            console.log(`Downloading file from Supabase: bucket=${bucket}, path=${path}`);

            const { data, error } = await supabase.storage.from(bucket).download(path);

            if (error) {
                console.error('Supabase download error:', error);
                throw new RestError(
                    HttpStatusCodes.NOT_FOUND,
                    `Failed to download file: ${error.message}`
                );
            }

            // Convert Blob to Buffer
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            return {
                buffer,
                contentType: data.type || 'application/octet-stream',
            };
        } catch (error: any) {
            console.error('Error downloading file from Supabase:', error);
            throw error instanceof RestError
                ? error
                : new RestError(
                    HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to download file from storage'
                );
        }
    },

    /**
     * Check if a file exists in Supabase Storage
     * @param bucket - Bucket name
     * @param path - File path in the bucket
     * @returns True if file exists
     */
    async fileExists(bucket: string, path: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.storage.from(bucket).list(path, {
                limit: 1,
            });

            return !error && data && data.length > 0;
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    },
};

export default StorageService;
