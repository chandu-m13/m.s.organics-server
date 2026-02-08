import { Router } from "express";
import asyncHandler from "../utils/async-handler";
import ContactUsController from "../controllers/contact-us.controller";

const router = Router();

router.post('/submit-enquiry', asyncHandler(ContactUsController.createEnquiry));
router.get('/fetch-all', asyncHandler(ContactUsController.fetchAllEnquiries));
router.get('/fetch-count', asyncHandler(ContactUsController.getEnquiriesCount));


export default router;
