import { Router } from "express";
import asyncHandler from "../utils/async-handler";
import OrderController from "../controllers/order.controller";

const router = Router();

// GET /api/order - Fetch orders with pagination and search
router.get('/', asyncHandler(OrderController.fetchOrders));

// POST /api/order/place-order - Place order from cart
router.post('/place-order', asyncHandler(OrderController.placeOrderByCart));

// PUT /api/order/confirm/:orderUniqueId - Confirm order by customer
router.put('/confirm/:orderUniqueId', asyncHandler(OrderController.confirmOrderByCustomer));

// PUT /api/order/admin/confirm/:orderUniqueId - Confirm order by admin
router.put('/admin/confirm/:orderUniqueId', asyncHandler(OrderController.confirmOrderByAdmin));

// PUT /api/order/admin/cancel/:orderUniqueId - Cancel order by admin
router.put('/admin/cancel/:orderUniqueId', asyncHandler(OrderController.cancelOrderByAdmin));

// GET /api/order/count - Get orders count with filters
router.get('/count', asyncHandler(OrderController.getOrdersCount));

// GET /api/order/allocations - Fetch order allocations with product and customer details
router.get('/order-details', asyncHandler(OrderController.fetchOrderDetails));

// POST /api/order/admin/create-order -  Create order directly by admin (no cart required)
router.post('/admin/create-order', asyncHandler(OrderController.createOrderByAdmin));

export default router;
