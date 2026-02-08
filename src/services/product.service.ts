import { prisma } from "../prisma"
import ApiResponse from "../utils/api-response";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import RestError from "../utils/rest-error";
import StorageService from "./storage.service";


const ProductService = {

    async fetchProducts(
        searchTerm: string,
        limit: number = 20,
        offset: number = 0,
        sort: Array<{ field: string; order: 'asc' | 'desc' }> = [{ field: 'name', order: 'asc' }]
    ) {
        // Map frontend column names to database fields
        const sortFieldMap: Record<string, string> = {
            name: 'name',
            price_per_kg: 'price_per_kg',
            is_active: 'is_active',
            createdAt: 'createdAt'
        };

        // Build orderBy array for Prisma
        const orderBy = sort
            .filter(s => sortFieldMap[s.field])
            .map(s => ({
                [sortFieldMap[s.field]]: s.order
            }));

        // Default to name asc if no valid sort fields
        const finalOrderBy = orderBy.length > 0 ? orderBy : [{ name: 'asc' as const }];

        const products = await prisma.product.findMany({
            where: {
                AND: [
                    { is_active: true },
                    searchTerm ? {
                        OR: [
                            { name: { contains: searchTerm, mode: 'insensitive' as any } },
                            { description: { contains: searchTerm, mode: 'insensitive' as any } }
                        ]
                    } : {}
                ]
            },
            include: {
                image: true
            },
            skip: offset,
            take: limit,
            orderBy: finalOrderBy
        });
        console.log('Fetching products with sort:', sort);
        return new ApiResponse(HttpStatusCodes.OK, 'Products Fetched Successfully', products);
    },

    async createProduct(payload: { name: string, description: string, price_per_kg: number, imageFile?: Express.Multer.File }) {
        if (!payload.name || payload.name.trim().length === 0) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product name is required');
        }
        if (!payload.description || payload.description.trim().length === 0) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product description is required');
        }
        if (!payload.imageFile) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product image is required');
        }
        if (typeof payload.price_per_kg !== 'number' || payload.price_per_kg <= 0) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Valid price_per_kg is required');
        }

        if (!process.env.SUPABASE_BUCKET) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Supabase Config is not set for Images Upload. Please contact admin');
        }

        // Upload image to Supabase Storage
        const timestamp = Date.now();
        const sanitizedFileName = payload.imageFile.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `products/${timestamp}-${sanitizedFileName}`;
        const bucket = process.env.SUPABASE_BUCKET;

        // Upload to Supabase Storage
        console.log('Uploading image to Supabase Storage...');
        const { storagePath, publicUrl } = await StorageService.uploadFile(
            bucket,
            fileName,
            payload.imageFile.buffer,
            payload.imageFile.mimetype
        );
        console.log('Image uploaded successfully:', { storagePath, publicUrl });

        // Create image record in database with public URL (if available) or storage path
        const image = await prisma.image.create({
            data: {
                name: payload.imageFile.originalname,
                source_url: publicUrl || storagePath // Store public URL for easy access
            }
        });

        // Create product
        const created = await prisma.product.create({
            data: {
                name: payload.name,
                description: payload.description,
                fk_id_image: image.id,
                price_per_kg: payload.price_per_kg,
                is_active: true
            },
            include: {
                image: true
            }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Product created successfully', created);
    },

    async updateProductById(id: number, payload: { name?: string, description?: string, price_per_kg?: number, is_active?: boolean, imageFile?: Express.Multer.File }) {
        const exists = await prisma.product.findFirst({
            where: { id, is_active: true },
            include: { image: true }
        });

        if (!exists) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product not found');
        }

        if (payload.price_per_kg !== undefined && (typeof payload.price_per_kg !== 'number' || payload.price_per_kg <= 0)) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'price_per_kg must be greater than 0');
        }

        console.log('Updating product:', {
            id,
            hasNewImage: !!payload.imageFile,
            currentImageId: (exists as any).fk_id_image,
            currentImageUrl: exists.image?.source_url
        });

        // If image file provided, upload to Supabase Storage and update image record
        if (payload.imageFile) {
            console.log('Uploading new image to Supabase Storage...');
            const timestamp = Date.now();
            const sanitizedFileName = payload.imageFile.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `products/${timestamp}-${sanitizedFileName}`;
            const bucket = process.env.SUPABASE_BUCKET || 'images';

            // Upload to Supabase Storage
            const { storagePath, publicUrl } = await StorageService.uploadFile(
                bucket,
                fileName,
                payload.imageFile.buffer,
                payload.imageFile.mimetype
            );
            console.log('New image uploaded successfully:', { storagePath, publicUrl });

            // Delete old image if it exists
            if (exists.image?.source_url) {
                try {
                    // Extract path from URL or use as-is if it's already a path
                    const oldImagePath = exists.image.source_url.includes('http')
                        ? new URL(exists.image.source_url).pathname.split('/').slice(-2).join('/')
                        : exists.image.source_url;
                    console.log('Deleting old image:', oldImagePath);
                    await StorageService.deleteFile(bucket, oldImagePath);
                } catch (error) {
                    console.warn('Failed to delete old image, continuing:', error);
                }
            }

            // Update existing image record with public URL
            if ((exists as any).fk_id_image) {
                await prisma.image.update({
                    where: { id: (exists as any).fk_id_image },
                    data: {
                        name: payload.imageFile.originalname,
                        source_url: publicUrl || storagePath
                    }
                });
                console.log('Image record updated in database');
            } else {
                // If product doesn't have an image, create one
                const newImage = await prisma.image.create({
                    data: {
                        name: payload.imageFile.originalname,
                        source_url: publicUrl || storagePath
                    }
                });

                // Link the new image to the product
                await prisma.product.update({
                    where: { id },
                    data: { fk_id_image: newImage.id }
                });
                console.log('New image created and linked to product');
            }
        } else {
            console.log('No new image provided, keeping existing image');
        }

        // Update product fields
        const updated = await prisma.product.update({
            where: { id },
            data: {
                ...(payload.name && { name: payload.name }),
                ...(payload.description && { description: payload.description }),
                ...(payload.price_per_kg && { price_per_kg: payload.price_per_kg }),
                ...(payload.is_active !== undefined && { is_active: payload.is_active })
            },
            include: { image: true }
        });

        console.log('Product updated successfully:', {
            id: updated.id,
            name: updated.name,
            imageUrl: updated.image?.source_url
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Product updated successfully', updated);
    },

    async softDeleteProductById(productId: number) {
        const exists = await prisma.product.findFirst({ where: { id: productId, is_active: true } });
        if (!exists) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product not found or already inactive');
        }

        const hasOrders = await prisma.orderBatchAllocation.count({
            where: {
                fk_id_product: productId
            }
        })
        if (hasOrders > 0) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Product has an active orders, cannot be deleted');
        }
        const updated = await prisma.product.update({
            where: { id: productId },
            data: { is_active: false },
            include: { image: true }
        });
        return new ApiResponse(HttpStatusCodes.OK, 'Product deleted successfully', updated);
    },

    async getProductsCount(searchTerm?: string) {
        const totalCount = await prisma.product.count({
            where: {
                AND: [
                    { is_active: true },
                    searchTerm ? {
                        OR: [
                            { name: { contains: searchTerm, mode: 'insensitive' as any } },
                            { description: { contains: searchTerm, mode: 'insensitive' as any } }
                        ]
                    } : {}
                ]
            }
        });
        return new ApiResponse(HttpStatusCodes.OK, 'Products count fetched successfully', { count: totalCount });
    },

    /**
     * Download product image from Supabase Storage
     * @param productId - ID of the product
     * @returns Public URL if available, otherwise downloads from storage
     */
    async downloadProductImage(productId: number) {
        const product = await prisma.product.findFirst({
            where: { id: productId, is_active: true },
            include: { image: true }
        });

        if (!product || !product.image) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'Product or image not found');
        }

        const sourceUrl = product.image.source_url;
        console.log('Image source URL:', sourceUrl);

        // If it's already a public URL, return it for redirect
        if (sourceUrl.includes('http')) {
            return {
                publicUrl: sourceUrl,
                isUrl: true
            };
        }

        // Otherwise, download from storage
        const bucket = process.env.SUPABASE_BUCKET || 'images';
        const { buffer, contentType } = await StorageService.downloadFile(bucket, sourceUrl);

        return {
            buffer,
            contentType,
            fileName: product.image.name,
            isUrl: false
        };
    },

    async fetchBestSellers(topK: number) {
        const products = await prisma.product.findMany({
            where: {
                AND: [
                    { is_active: true },
                ]
            },
            include: {
                image: true
            },
            orderBy: {
                orders: {
                    _count: 'desc'
                }
            },
            take: topK
        });
        return products;
    }

};


export default ProductService;