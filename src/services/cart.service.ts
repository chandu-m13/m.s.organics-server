import { Address } from "../interfaces/Address.interface";
import { Customer } from "../interfaces/Customer.interface";
import { prisma } from "../prisma";
import ApiResponse from "../utils/api-response";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import RestError from "../utils/rest-error";
import { generateCartUniqueId } from "../utils/unique-field-utils";
import { validateAddress, validateCustomer } from "../utils/validation-utils";

type CartData = {
    productId: number,
    quantity: number
};
const CartService = {


    createCart: async function(cartItems: CartData[], address: Address, customer: Customer) {
        let productsCount = await prisma.product.count({
            where: {
                id: {
                    in: cartItems.map(item => item.productId)
                },
                is_active: true
            }
        });
        if(productsCount != cartItems.length) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Some Products are not available right now. Please remove them from cart');
        }
        // Check if quantity is a valid decimal (number and not NaN or negative/zero)
        let totalQuantity : number = 0, productIdSumForCartUniqueId: number = 0;
        cartItems.forEach((item) => {
            if (typeof item.quantity !== "number" || isNaN(item.quantity) || !isFinite(item.quantity) || item.quantity <= 0) {
                throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Quantity must be a valid number greater than 0');
            }
            totalQuantity += item.quantity;
            productIdSumForCartUniqueId += item.productId;
        })  

        let cartUniqueId = generateCartUniqueId(productIdSumForCartUniqueId, totalQuantity);
        validateAddress(address);
        validateCustomer(customer);
        let createdAddress = await prisma.address.create({
            data: {
                address_line: address.addressLine1,
                city: address.city,
                district: address.district
            }
        });
        let createdCustomer = await prisma.customer.create({
            data: {
                name: customer.name,
                email: customer.email,
                mobile_number: customer.mobile,
                is_active: true,
                fk_id_address: createdAddress.id
            }
        })
        let cartData = await prisma.cart.create({
            data: {
                cart_unique_id: cartUniqueId,
                is_active: true,
                fk_id_customer: createdCustomer.id
            }
        });
        let cartItemsToBeCreated = cartItems.map(item => {
            return {
                quantity: item.quantity,
                fk_id_product: item.productId,
                fk_id_cart: cartData.id
            }
        })
        let cartItemsData = await prisma.cartItem.createMany({
            data: cartItemsToBeCreated  
        })
        return new ApiResponse(HttpStatusCodes.OK, 'Cart created successfully', {
            cartUniqueId: cartData.cart_unique_id
        });
    },

    fetchCart: async function(cartUniqueId: string) {
        let cartData = await prisma.cart.findFirst({
            where: {
                cart_unique_id: cartUniqueId
            },
            include: {
                customer: true,
                cartItems: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if(!cartData) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Cart not found');
        }
        return new ApiResponse(HttpStatusCodes.OK,'Cart Fetched Successfully', cartData);
    },

    deleteCart: async function(cartUniqueId: string) {
        if (!cartUniqueId) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Cart unique ID is required');
        }

        let cartData = await prisma.cart.findMany({
            where: {
                cart_unique_id: cartUniqueId
            }
        });

        if (cartData.length === 0) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'Cart not found');
        }

        await prisma.cart.delete({
            where: {
                id: cartData[0].id
            }
        });

        // Deliberate mistake 5: Wrong HTTP status code
        return new ApiResponse(HttpStatusCodes.CREATED, 'Cart deleted successfully', {
            message: 'Cart and all items removed'
        });
    }

    
}

export default CartService;