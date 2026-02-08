import { Request, Response, NextFunction } from "express";
import EnquiryService from "../services/enquiry.service";
import asyncHandler from "../utils/async-handler";

const EnquiryController = {

    createEnquiry: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const enquiryData = req.body;
        return await EnquiryService.createEnquiry(enquiryData);
    })
};

export default EnquiryController; 