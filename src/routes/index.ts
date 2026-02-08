import { Router } from "express";
import ProductRoutes from '../routes/product.routes';
import ContactUsRoutes from '../routes/contact-us.routes';
import OrderRoutes from '../routes/order.routes';
import CartRoutes from '../routes/cart.routes';
import StockBatchRoutes from '../routes/stock-batch.routes';
import UserRoutes from '../routes/user.routes';
import AgentRoutes from '../routes/agent.routes';
import authMiddleware from '../middleware/auth.middleware';
import { apiKeyMiddleware } from '../middleware/api-key.middleware';

const router = Router();

// Middleware that accepts EITHER JWT token OR API key
const authOrApiKey = (req: any, res: any, next: any) => {
    // Check if API key is present
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
        // Use API key middleware
        return apiKeyMiddleware(req, res, next);
    } else {
        // Use JWT middleware
        return authMiddleware(req, res, next);
    }
};

// Public routes (no authentication required)
router.use('/user', UserRoutes); // User routes handle their own auth (login is public, others are protected)
router.use('/contact-us', ContactUsRoutes); // Contact form is public
router.use('/agent', AgentRoutes); // API key generation is public

// Protected routes (authentication required - JWT OR API Key)
router.use('/product', authOrApiKey, ProductRoutes);
router.use('/cart', authOrApiKey, CartRoutes);
router.use('/order', authOrApiKey, OrderRoutes);
router.use('/stock-batch', authOrApiKey, StockBatchRoutes);

export default router;