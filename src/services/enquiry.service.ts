import { prisma } from "../prisma"
import ApiResponse from "../utils/api-response";
import RestError from "../utils/rest-error";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";

interface EnquiryData {
    name: string;
    mobile: string;
    email: string;
    message: string;
}

const EnquiryService = {

    async createEnquiry(enquiryData: EnquiryData) {
        try {
            // Validate required fields
            if (!enquiryData.name || !enquiryData.mobile || !enquiryData.email || !enquiryData.message) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "All fields (name, mobile, email, message) are required"
                );
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(enquiryData.email)) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "Invalid email format"
                );
            }

            // Validate mobile number (basic validation for 10 digits)
            const mobileRegex = /^\d{10}$/;
            if (!mobileRegex.test(enquiryData.mobile)) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "Mobile number must be 10 digits"
                );
            }

            const enquiry = await prisma.enquiry.create({
                data: {
                    name: enquiryData.name,
                    mobile: enquiryData.mobile,
                    email: enquiryData.email,
                    message: enquiryData.message
                }
            });

            return new ApiResponse(
                HttpStatusCodes.CREATED,
                "Enquiry submitted successfully",
                enquiry
            );
        } catch (error) {
            if (error instanceof RestError) {
                throw error;
            }
            throw new RestError(
                HttpStatusCodes.INTERNAL_SERVER_ERROR,
                "Failed to create enquiry",
                null,
                error
            );
        }
    }
};

export default EnquiryService; 