import { Router } from "express";
import asyncHandler from "../utils/async-handler";
import UserController from "../controllers/user.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

// POST /api/user/login - User login (public route)
router.post('/login', asyncHandler(UserController.login));

// POST /api/user/logout - User logout (protected route - requires valid token to blacklist it)
router.post('/logout', authMiddleware, asyncHandler(UserController.logout));

// POST /api/user/refresh-token - Refresh access token (public route)
router.post('/refresh-token', asyncHandler(UserController.refreshToken));

// POST /api/user/reset-password - Reset user password (protected route)
router.post('/reset-password', authMiddleware, asyncHandler(UserController.resetPassword));

// GET /api/user/profile - Get user profile (protected route)
router.get('/profile', authMiddleware, asyncHandler(UserController.getProfile));

export default router;

