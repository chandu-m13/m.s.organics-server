import { Request, Response } from 'express';
import ProductService from "../services/product.service"
import { TOP_K_BEST_SELLERS } from '../utils/constants';

const ProductController = {
    async fetchProducts(req: Request, res: Response) {
        const { q, limit, offset, sort } = req.query as any;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const offsetNum = offset ? parseInt(offset, 10) : 0;

        // Parse sort - expected format: JSON array like [{"field":"name","order":"asc"}]
        let sortArray: Array<{ field: string; order: 'asc' | 'desc' }> = [{ field: 'name', order: 'asc' }];
        if (sort) {
            try {
                const parsed = JSON.parse(sort);
                if (Array.isArray(parsed)) {
                    sortArray = parsed;
                }
            } catch (e) {
                console.log('Failed to parse sort param, using default');
            }
        }

        console.log('Got the request in controller with sort:', sortArray);
        return ProductService.fetchProducts(q || '', limitNum, offsetNum, sortArray);
    },

    async fetchBestSellers(req: Request, res: Response) {
        const { topK } = req.query as any;
        const topKNum = topK ? parseInt(topK, 10) : TOP_K_BEST_SELLERS;
        return ProductService.fetchBestSellers(topKNum);
    },

    async getProductsCount(req: Request, res: Response) {
        const { q } = req.query as any;
        return ProductService.getProductsCount(q || '');
    },

    async createProduct(req: Request, res: Response) {
        const { name, description, price_per_kg } = req.body;
        const imageFile = req.file;
        return ProductService.createProduct({
            name,
            description,
            price_per_kg: parseFloat(price_per_kg),
            imageFile
        });
    },

    async updateProduct(req: Request, res: Response) {
        const { id } = req.params;
        const { name, description, price_per_kg, is_active } = req.body;
        const imageFile = req.file;

        console.log('Update product request:', {
            id,
            name,
            description,
            price_per_kg,
            is_active,
            hasImageFile: !!imageFile,
            imageFileName: imageFile?.originalname
        });

        return ProductService.updateProductById(Number(id), {
            name,
            description,
            price_per_kg: price_per_kg ? parseFloat(price_per_kg) : undefined,
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            imageFile
        });
    },

    async deleteProduct(req: Request, res: Response) {
        const { id } = req.params;
        return ProductService.softDeleteProductById(Number(id));
    },

    /**
     * Download product image or redirect to public URL
     * Handles both public bucket URLs and private bucket downloads
     * NOTE: This function is NOT wrapped in asyncHandler because it sends raw buffer or redirect
     */
    async downloadProductImage(req: Request, res: Response) {
        const { id } = req.params;

        try {
            const result = await ProductService.downloadProductImage(Number(id));

            // If it's a public URL, redirect to it
            if (result.isUrl && result.publicUrl) {
                res.redirect(result.publicUrl);
                return;
            }

            // Otherwise, send the buffer directly
            if (result.buffer && result.contentType && result.fileName) {
                res.set({
                    'Content-Type': result.contentType,
                    'Content-Disposition': `inline; filename="${result.fileName}"`,
                    'Cache-Control': 'public, max-age=31536000, immutable'
                });
                res.send(result.buffer);
                return;
            }

            // Fallback error
            res.status(500).json({
                success: false,
                message: 'Invalid response from image service'
            });
        } catch (error: any) {
            console.error('Error downloading product image:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to download image'
            });
        }
    }
}


export default ProductController;