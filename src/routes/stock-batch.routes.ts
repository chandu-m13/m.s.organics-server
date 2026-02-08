import { Router } from "express";
import asyncHandler from "../utils/async-handler";
import StockBatchController from "../controllers/stock-batch.controller";

const router = Router();

// GET /api/stock-batch - Fetch stock batches with optional filters
router.get('/', asyncHandler(StockBatchController.fetch));

// GET /api/stock-batch/count - Get count of stock batches with optional filters
router.get('/count', asyncHandler(StockBatchController.count));

// POST /api/stock-batch - Create a stock batch
router.post('/', asyncHandler(StockBatchController.create));

// PUT /api/stock-batch/:id - Update a stock batch by id
router.put('/:id', asyncHandler(StockBatchController.updateById));

// DELETE /api/stock-batch/:id - Delete a stock batch by id
router.delete('/:id', asyncHandler(StockBatchController.deleteById));

export default router;


