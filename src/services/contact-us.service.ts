import { prisma } from "../prisma"
import ApiResponse from "../utils/api-response";
import RestError from "../utils/rest-error";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import EnquiryData from "../interfaces/EnquiryData.interface";
import { indianMobileNumberRegex, emailRegex } from "../utils/regex";

const EnquiryService = {

    async createEnquiry(enquiryData: EnquiryData) {
        try {
            // Validate required fields
            enquiryData.mobile = String(enquiryData.mobile);
            if (!enquiryData.name || !enquiryData.mobile || !enquiryData.message) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "All fields name, mobile, message are required"
                );
            }

            // Validate email format
            if (enquiryData.email && !emailRegex.test(enquiryData.email)) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "Invalid email format"
                );
            }

            // Validate mobile number (basic validation for 10 digits)
            if (!indianMobileNumberRegex.test(enquiryData.mobile)) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "Mobile number must be 10 digits"
                );
            }

            const enquiry = await prisma.enquiry.create({
                data: enquiryData
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
    },

    async fetchAllEnquiries(limit?: number, offset?: number) {
        try {
            // Set default values if not provided
            const take = limit || 10;
            const skip = Math.max(offset || 0,0);

            // Validate limit and offset
            if (take < 1 || take > 100) {
                throw new RestError(
                    HttpStatusCodes.BAD_REQUEST,
                    "Limit must be between 1 and 100"
                );
            }

            const enquiries = await prisma.enquiry.findMany({
                skip: skip,
                take: take,
                orderBy: {
                    id: 'desc' // Latest enquiries first
                }
            });

            return new ApiResponse(
                HttpStatusCodes.OK,
                "Enquiries fetched successfully",
                enquiries
            );
        } catch (error) {
            throw new RestError(
                HttpStatusCodes.INTERNAL_SERVER_ERROR,
                "Failed to fetch enquiries",
                null,
                error
            );
        }
    },

    async getEnquiriesCount() {
        try {
            const totalCount = await prisma.enquiry.count();

            return new ApiResponse(
                HttpStatusCodes.OK,
                "Enquiries count fetched successfully",
                {
                    total: totalCount
                }
            );
        } catch (error) {
            if (error instanceof RestError) {
                throw error;
            }
            throw new RestError(
                HttpStatusCodes.INTERNAL_SERVER_ERROR,
                "Failed to fetch enquiries count",
                null,
                error
            );
        }
    }
};

export default EnquiryService;