import { Router } from "express";
import asyncHandler from "../utils/async-handler";
import ProductController from "../controllers/product.controller";
import { imageUpload } from "../middleware/upload.middleware";

const router = Router();


router.get('/fetch-products', asyncHandler(ProductController.fetchProducts));
router.get('/count', asyncHandler(ProductController.getProductsCount));
// NOTE: downloadProductImage is NOT wrapped in asyncHandler because it sends raw buffer
router.get('/:id/image', ProductController.downloadProductImage); // Download image from Supabase via backend
router.post('/', imageUpload.single('image'), asyncHandler(ProductController.createProduct));
router.put('/:id', imageUpload.single('image'), asyncHandler(ProductController.updateProduct));
router.delete('/:id', asyncHandler(ProductController.deleteProduct));
router.get('/best-sellers', asyncHandler(ProductController.fetchBestSellers));


export default router;