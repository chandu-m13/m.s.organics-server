import { Address } from "../interfaces/Address.interface";
import { Customer } from "../interfaces/Customer.interface";
import { MIN_ADDRESS_LINE_LENGTH, MIN_USER_NAME_LENGTH } from "./constants";
import HttpStatusCodes from "./HTTP_STATUS_CODES";
import { emailRegex, indianMobileNumberRegex } from "./regex";
import RestError from "./rest-error";

export function validateAddress(address: Address) {
    const { addressLine1, pinCode, city, district } = address;

    if (!addressLine1 || addressLine1.length < MIN_ADDRESS_LINE_LENGTH) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            `Address Line 1 must be at least ${MIN_ADDRESS_LINE_LENGTH} characters long`
        );
    }

    if (!city || city.trim().length === 0) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "City is required"
        );
    }

    if (!district || district.trim().length === 0) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "District is required"
        );
    }

    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "Pin code must be a 6-digit number"
        );
    }
}

export function validateCustomer(customer: Customer) {
    const { name, mobile, email } = customer;

    // Name validation
    if (!name || typeof name !== "string" || name.trim().length < MIN_USER_NAME_LENGTH) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "Customer name must be at least 3 characters long"
        );
    }

    // Mobile validation (must be 10 digits)
    if (!mobile || !indianMobileNumberRegex.test(mobile)) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "Customer mobile must be a valid 10-digit number"
        );
    }

    // Email validation (if provided)
    if (email && !emailRegex.test(email)) {
        throw new RestError(
            HttpStatusCodes.BAD_REQUEST,
            "Customer email is not valid"
        );
    }
}