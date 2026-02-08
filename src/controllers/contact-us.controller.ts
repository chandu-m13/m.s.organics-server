import { Request, Response, NextFunction } from "express";
import EnquiryService from "../services/contact-us.service";
import asyncHandler from "../utils/async-handler";
import ContactUsService from "../services/contact-us.service";

const ContactUsController = {

    createEnquiry: async function(req: Request, res: Response) {
        const { name, mobile, email, message } = req.body;
        return ContactUsService.createEnquiry({name,mobile,email,message}); 
    },

    fetchAllEnquiries: async function(req: Request, res: Response) {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        return ContactUsService.fetchAllEnquiries(limit, offset);
    },

    getEnquiriesCount: async function(req: Request, res: Response) {
        return ContactUsService.getEnquiriesCount();
    }
};

export default ContactUsController;
