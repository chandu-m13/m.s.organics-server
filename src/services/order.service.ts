import { Order } from "@prisma/client";
import moment from "moment";
import { Address } from "../interfaces/Address.interface";
import CartItem from "../interfaces/CartItem";
import { Customer } from "../interfaces/Customer.interface";
import { OrderSearchFilter } from "../interfaces/OrderSearchFilter.interface";
import { StockBatch } from "../interfaces/StockBatch.interface";
import { prisma } from "../prisma";
import ApiResponse from "../utils/api-response";
import { MAX_LIMIT_PER_PAGE, ORDER_STATUS, SHIPPING_TIME } from "../utils/constants";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import RestError from "../utils/rest-error";
import { generateCartUniqueId, generateOrderUniqueId } from "../utils/unique-field-utils";
import { validateAddress, validateCustomer } from "../utils/validation-utils";


const OrderService = {

    placeOrderByCart: async function (cartUniqeId: string, maxDateRequired: Date) {
        // since order is placed through cart, all the pre validations are placed at Cart time creation itself
        // make sure only necessary checks for order placement are added here
        // if need to validate order, make sure to check CartService.createCart() and try to add validations there itself
        if (!(maxDateRequired instanceof Date) || isNaN(maxDateRequired.getTime())) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Please provide a valid date for maximum delivery date');
        }
        const now = new Date();
        // Remove time part for comparison if you want only date, or keep as is for full datetime
        if (maxDateRequired < now) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Please provide a date in the future for delivery date');
        }
        let cart = await prisma.cart.findFirst({
            where: {
                cart_unique_id: cartUniqeId,
                is_active: true
            }
        });
        if (!cart) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Cart not found. Please try adding again');

        }
        let cartItems = await prisma.cartItem.findMany({
            where: {
                fk_id_cart: cart.id
            }
        })
        if (!cartItems || !cartItems.length) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'No Items found in Cart. Please add atleast one item in Cart');
        }
        await prisma.order.deleteMany({
            where: { fk_id_created_through_cart: cart.id }
        })
        let quantityRequirement = new Map();
        cartItems.forEach((item) => {
            if (!quantityRequirement.has(item.fk_id_product)) {
                quantityRequirement.set(item.fk_id_product, 0);
            }
            let currQuantity = quantityRequirement.get(item.fk_id_product) + item.quantity
            quantityRequirement.set(item.fk_id_product, currQuantity);
        })
        let availableBatches = await prisma.stockBatch.findMany({
            where: {
                fk_id_product: {
                    in: cartItems.map(item => item.fk_id_product)
                },
                is_active: true
            },
            orderBy: { end_date: 'asc' }
        });
        let hasRequiredQuantity = this.checkIfHasRequiredQuantity(availableBatches, quantityRequirement);
        if (!hasRequiredQuantity) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Required quantity is not yet available. Please try again later');
        }
        let earliestDeliveryDate = this.getEarliestDeliveryDate(availableBatches, quantityRequirement, maxDateRequired);

        let canProvideInRequiredTime = earliestDeliveryDate <= maxDateRequired.getTime();

        let orderDateConfirmationOptions = await prisma.orderDateConfirmationOption.findMany({
            where: {
                OR: [
                    {
                        label: {
                            contains: 'approval_pending_by_customer',
                            mode: 'insensitive'
                        }
                    },
                    {
                        label: {
                            contains: 'confirmed_by_customer',
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        });
        console.log('order options : ', orderDateConfirmationOptions);
        let pendingOption = orderDateConfirmationOptions.find((option) => option.label.toLowerCase().includes('pending'));
        let confirmOrderByCustomerOption = orderDateConfirmationOptions.find((option) => option.label.toLowerCase().includes('success'));
        let createdOrder = await prisma.order.create({
            data: {
                max_date_requsted_by_customer: maxDateRequired,
                delivery_date: earliestDeliveryDate,
                is_active: true,
                order_status: ORDER_STATUS.confirmedByCustomer.value,
                order_unique_id: generateOrderUniqueId(cartUniqeId, maxDateRequired),
                fk_id_customer: cart.fk_id_customer,
                fk_id_order_date_confirmation: canProvideInRequiredTime ? (confirmOrderByCustomerOption?.id || 2) : (pendingOption?.id || 1),
                fk_id_created_through_cart: cart.id
            }
        });
        if (!canProvideInRequiredTime) {
            return new ApiResponse(HttpStatusCodes.OK,
                'Order could not be processed for the given date. Please confirm with given date for delivery', createdOrder);
        }
        await this.createOrderBatches(availableBatches, cartItems, createdOrder);

        // Only update cart if order was created through cart (not admin-created)
        if (createdOrder.fk_id_created_through_cart) {
            await prisma.cart.update({
                where: { id: createdOrder.fk_id_created_through_cart },
                data: { is_active: false }
            });
        }

        return new ApiResponse(HttpStatusCodes.OK, 'Order placed successfully', createdOrder);
    },

    createOrderBatches: async function (availableBatches: Array<StockBatch>, cartItems: Array<CartItem>, createdOrder: Order) {
        let orderBatches: Array<{
            fk_id_order: number;
            fk_id_product: number;
            fk_id_batch: number;
            quantity_allocated: number;
        }> = [];
        cartItems.forEach((cartItem) => {
            console.log('cartItem : ', cartItem);
            let productId = cartItem.fk_id_product;
            let requiredQuantity = cartItem.quantity;

            for (let i = 0; i < availableBatches.length; i++) {
                console.log('===iteraion===');
                let batch = availableBatches[i];
                let currOrderBatch = {
                    fk_id_order: createdOrder.id,
                    fk_id_product: productId,
                    fk_id_batch: 0,
                    quantity_allocated: 0
                }
                console.log('batch.fk_id_product ======>  : ', batch.fk_id_product, 'productId ======>  : ', productId);
                if (batch.fk_id_product === productId) {
                    let remainingQuantity = batch.quantity_produced - batch.quantity_allocated;
                    if (requiredQuantity <= 0) {
                        break;
                    }
                    if (remainingQuantity >= requiredQuantity) {
                        currOrderBatch.fk_id_batch = batch.id;
                        currOrderBatch.quantity_allocated = requiredQuantity;
                        batch.quantity_allocated += requiredQuantity;
                        requiredQuantity -= requiredQuantity;
                        console.log('Allocated in If', currOrderBatch.quantity_allocated);
                    }
                    else {
                        currOrderBatch.fk_id_batch = batch.id;
                        currOrderBatch.quantity_allocated = remainingQuantity;
                        batch.quantity_allocated += remainingQuantity;
                        requiredQuantity -= remainingQuantity;
                        console.log('Allocated in Else', currOrderBatch.quantity_allocated);
                    }
                }
                if (currOrderBatch.quantity_allocated > 0) {
                    console.log('Pushing to orderBatches ====');
                    orderBatches.push(currOrderBatch);
                }
            }
        })
        console.log('orderBatches ======>  : ', orderBatches.length);
        await prisma.orderBatchAllocation.createMany({
            data: orderBatches
        });
        for (let batch of availableBatches) {
            await prisma.stockBatch.update({
                where: { id: batch.id },
                data: { quantity_allocated: batch.quantity_allocated }
            });
        }
    },

    getEarliestDeliveryDate: function (availableBatches: Array<StockBatch>, quantityRequirement: Map<number, number>, maxDateRequired: Date) {
        let stockAvailabilityResults = new Map();
        let earliestDeliveryDate = null;

        for (let i = 0; i < availableBatches.length; i++) {
            // For each batch, we will organize them by product id into two arrays:
            //  - batchesAvailableInTime: batches whose end_date is at least 2 days before maxDateRequired
            //  - batchesAvailableLater: batches whose end_date is after (maxDateRequired - 2 days)
            // We'll also track the minimum date (minDate) for which the requested quantity can be provided for each product.
            let batch = availableBatches[i];
            const productId = batch.fk_id_product;
            if (!stockAvailabilityResults.has(productId)) {
                stockAvailabilityResults.set(productId, {
                    quantityAvailableInTime: 0,
                    quantityAvailableLater: 0,
                    minDateRequiredForDelivery: null,

                });
            }
            const productEntry = stockAvailabilityResults.get(productId);

            // Use moment for better date comparison
            let batchEndDate = moment(batch.end_date);
            let maxDate = moment(maxDateRequired);
            let deliveryDate = batchEndDate.clone().add(SHIPPING_TIME, 'days');

            // check if atleast there is atleast 2 days gap from stock production end date and max date required by customer
            let remainingQuantity = batch.quantity_produced - batch.quantity_allocated;
            if (deliveryDate.isSameOrBefore(maxDate)) {
                productEntry.quantityAvailableInTime += remainingQuantity;
            } else {
                productEntry.quantityAvailableLater += remainingQuantity;
            }
            const requiredQuantity = quantityRequirement.get(productId);
            // ensure product is requested by the customer
            if (requiredQuantity && productEntry.quantityAvailableInTime + productEntry.quantityAvailableLater >= requiredQuantity) {
                let deliveryTimestamp = deliveryDate.toDate();
                if (!productEntry.minDateRequiredForDelivery) {
                    console.log('deliveryTimestamp ======>  : ', deliveryTimestamp);
                    productEntry.minDateRequiredForDelivery = deliveryTimestamp;
                }
                else {
                    productEntry.minDateRequiredForDelivery = moment.min(moment(productEntry.minDateRequiredForDelivery), moment(deliveryTimestamp)).toDate();
                }
                earliestDeliveryDate = productEntry.minDateRequiredForDelivery;
            }
        }
        console.log('earliestDeliveryDate ======>  : ', earliestDeliveryDate);
        return earliestDeliveryDate;
    },

    checkIfHasRequiredQuantity: function (availableBatches: Array<StockBatch>, quantityRequirement: Map<number, number>) {
        // Clone quantityRequirement
        const quantityRequirementClone = new Map(quantityRequirement);
        console.log('length of availableBatches ===>: ', availableBatches.length);
        for (let batch of availableBatches) {
            console.log('===iteraion===');
            const productId = batch.fk_id_product;
            const requiredQuantity = quantityRequirementClone.get(productId);

            if (quantityRequirementClone.has(productId) && requiredQuantity && requiredQuantity > 0) {
                let remainingQuantity = batch.quantity_produced - batch.quantity_allocated;

                // Only subtract the minimum of remaining quantity and required quantity
                let quantityToSubtract = Math.min(remainingQuantity, requiredQuantity);
                quantityRequirementClone.set(productId, requiredQuantity - quantityToSubtract);
            }
        }

        // Check if all requirements are fulfilled (all values should be <= 0)
        console.log('quantityRequirementClone : ', quantityRequirementClone);
        for (let [productId, requiredQty] of quantityRequirementClone.entries()) {
            if (requiredQty > 0) {
                return false;
            }
        }
        return true;
    },

    confirmOrderByCustomer: async function (orderUniqueId: string) {

        let adminApproveOption = await prisma.orderDateConfirmationOption.findFirst({
            where: {
                label: {
                    contains: '%approved_by_admin%',
                    mode: "insensitive"
                }
            }
        })

        let foundOrder = await prisma.order.findFirst({
            where: { is_active: true, order_unique_id: orderUniqueId }
        });
        if (!foundOrder) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Order not found or not active');
        }

        // Only process cart items if order was created through cart (not admin-created)
        if (!foundOrder.fk_id_created_through_cart) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'This order was created by admin and cannot be confirmed by customer');
        }

        let cartItems = await prisma.cartItem.findMany({
            where: { fk_id_cart: foundOrder.fk_id_created_through_cart }
        });
        let availableBatches = await prisma.stockBatch.findMany({
            where: { fk_id_product: { in: cartItems.map(item => item.fk_id_product) } }
        });
        console.log('availableBatches ======>  : ', availableBatches.length);
        await this.createOrderBatches(availableBatches, cartItems, foundOrder);

        await prisma.cart.update({
            where: { id: foundOrder.fk_id_created_through_cart },
            data: { is_active: false }
        });
        await prisma.order.update({
            where: { id: foundOrder.id },
            data: {
                fk_id_order_date_confirmation: adminApproveOption?.id || 3
            }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Order Confirmed Successfully', foundOrder);
    },

    fetchOrders: async function (limit: number = 10, offset: number = 0, searchFilter?: OrderSearchFilter, sort?: Array<{ field: string; order: 'asc' | 'desc' }>) {
        // Validate parameters
        limit = Math.min(limit, MAX_LIMIT_PER_PAGE);
        offset = Math.max(offset, 0);

        // Build where clause for search functionality
        let whereClause: any = {
            is_active: true
        };

        if (searchFilter) {
            // Build search conditions
            let searchConditions: any[] = [];

            // Search by order unique ID
            if (searchFilter.orderUniqueId) {
                searchConditions.push({
                    order_unique_id: {
                        contains: searchFilter.orderUniqueId,
                        mode: 'insensitive'
                    }
                });
            }

            // Search by customer name
            if (searchFilter.customerName) {
                searchConditions.push({
                    customer: {
                        name: {
                            contains: searchFilter.customerName,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by customer email
            if (searchFilter.customerEmail) {
                searchConditions.push({
                    customer: {
                        email: {
                            contains: searchFilter.customerEmail,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by customer mobile
            if (searchFilter.customerMobile) {
                searchConditions.push({
                    customer: {
                        mobile_number: {
                            contains: searchFilter.customerMobile,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by delivery date range
            if (searchFilter.deliveryDateFrom || searchFilter.deliveryDateTo) {
                let dateCondition: any = {};

                if (searchFilter.deliveryDateFrom) {
                    dateCondition.gte = searchFilter.deliveryDateFrom;
                }

                if (searchFilter.deliveryDateTo) {
                    dateCondition.lte = searchFilter.deliveryDateTo;
                }

                searchConditions.push({
                    delivery_date: dateCondition
                });
            }

            // If any search conditions exist, use OR logic for better search experience
            if (searchConditions.length > 0) {
                whereClause.OR = searchConditions;
            }
        }

        // Get total count for pagination
        const totalCount = await prisma.order.count({
            where: whereClause
        });
        console.log(' where clause : ', JSON.stringify(whereClause));

        // Build orderBy from sort parameter
        const sortFieldMap: Record<string, any> = {
            'order_unique_id': 'order_unique_id',
            'delivery_date': 'delivery_date',
            'customer_name': { customer: { name: 'asc' } },
            'createdAt': 'createdAt'
        };

        let orderBy: any = { createdAt: 'desc' };  // Default sort

        if (sort && sort.length > 0) {
            const sortConfig = sort[0];  // Use first sort config
            const mapping = sortFieldMap[sortConfig.field];

            if (mapping) {
                if (typeof mapping === 'string') {
                    orderBy = { [mapping]: sortConfig.order };
                } else {
                    // Handle nested relations (customer name)
                    orderBy = { customer: { name: sortConfig.order } };
                }
            }
        }

        // Fetch orders with pagination and include related data
        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                customer: {
                    include: {
                        address: true
                    }
                },
                orderDateConfirmation: true,
                batchAllocations: {
                    include: {
                        product: {
                            include: {
                                image: true
                            }
                        },
                        batch: true
                    }
                }
            },
            orderBy: orderBy,
            take: limit,
            skip: offset
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(offset / limit) + 1;
        const hasNextPage = offset + limit < totalCount;
        const hasPreviousPage = offset > 0;

        const paginationInfo = {
            totalCount,
            totalPages,
            currentPage,
            limit,
            offset,
            hasNextPage,
            hasPreviousPage
        };

        return new ApiResponse(HttpStatusCodes.OK, 'Orders fetched successfully', {
            orders,
            pagination: paginationInfo
        });
    },

    confirmOrderByAdmin: async function (orderUniqueId: string) {
        let successOption = await prisma.orderDateConfirmationOption.findFirst({
            where: {
                option_key: {
                    contains: 'approved_by_admin',
                    mode: "insensitive"
                }
            }
        });

        let foundOrder = await prisma.order.findFirst({
            where: { is_active: true, order_unique_id: orderUniqueId }
        });

        if (!foundOrder) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Order not found or not active');
        }

        // Update order status to confirmed
        let updatedOrder = await prisma.order.update({
            where: { id: foundOrder.id },
            data: {
                fk_id_order_date_confirmation: successOption?.id || 3
            },
            include: {
                customer: {
                    include: {
                        address: true
                    }
                },
                orderDateConfirmation: true,
                batchAllocations: {
                    include: {
                        product: {
                            include: {
                                image: true
                            }
                        },
                        batch: true
                    }
                }
            }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Order Confirmed Successfully by Admin', updatedOrder);
    },

    cancelOrderByAdmin: async function (orderUniqueId: string) {
        let cancelledOption = await prisma.orderDateConfirmationOption.findFirst({
            where: {
                option_key: {
                    contains: 'cancelled',
                    mode: "insensitive"
                }
            }
        });

        let foundOrder = await prisma.order.findFirst({
            where: { is_active: true, order_unique_id: orderUniqueId }
        });

        if (!foundOrder) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Order not found or not active');
        }

        // Update order status to cancelled and deactivate it
        let updatedOrder = await prisma.order.update({
            where: { id: foundOrder.id },
            data: {
                fk_id_order_date_confirmation: cancelledOption?.id || 4
            },
            include: {
                customer: {
                    include: {
                        address: true
                    }
                },
                orderDateConfirmation: true,
                batchAllocations: {
                    include: {
                        product: {
                            include: {
                                image: true
                            }
                        },
                        batch: true
                    }
                }
            }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Order Cancelled Successfully by Admin', updatedOrder);
    },

    getOrdersCount: async function (searchFilter?: OrderSearchFilter) {
        // Build where clause for search functionality (same logic as fetchOrders)
        let whereClause: any = {
            is_active: true
        };

        if (searchFilter) {
            // Build search conditions
            let searchConditions: any[] = [];

            // Search by order unique ID
            if (searchFilter.orderUniqueId) {
                searchConditions.push({
                    order_unique_id: {
                        contains: searchFilter.orderUniqueId,
                        mode: 'insensitive'
                    }
                });
            }

            // Search by customer name
            if (searchFilter.customerName) {
                searchConditions.push({
                    customer: {
                        name: {
                            contains: searchFilter.customerName,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by customer email
            if (searchFilter.customerEmail) {
                searchConditions.push({
                    customer: {
                        email: {
                            contains: searchFilter.customerEmail,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by customer mobile
            if (searchFilter.customerMobile) {
                searchConditions.push({
                    customer: {
                        mobile_number: {
                            contains: searchFilter.customerMobile,
                            mode: 'insensitive'
                        }
                    }
                });
            }

            // Search by delivery date range
            if (searchFilter.deliveryDateFrom || searchFilter.deliveryDateTo) {
                let dateCondition: any = {};

                if (searchFilter.deliveryDateFrom) {
                    dateCondition.gte = searchFilter.deliveryDateFrom;
                }

                if (searchFilter.deliveryDateTo) {
                    dateCondition.lte = searchFilter.deliveryDateTo;
                }

                searchConditions.push({
                    delivery_date: dateCondition
                });
            }

            // If any search conditions exist, use OR logic for better search experience
            if (searchConditions.length > 0) {
                whereClause.OR = searchConditions;
            }
        }

        // Get total count
        const totalCount = await prisma.order.count({
            where: whereClause
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Orders count fetched successfully', {
            count: totalCount
        });
    }
    ,

    fetchOrderDetails: async function (orderIds?: number[], orderUniqueIds?: string[]) {
        // Build where clause for orders by ids/unique ids
        const whereClause: any = {};
        const filters: any[] = [];
        if ((!orderIds || !orderIds.length) && (!orderUniqueIds || !orderUniqueIds.length)) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Atleast one of order ids or order unique ids is required');
        }
        if (orderIds && orderIds.length) {
            filters.push({ id: { in: orderIds } });
        }
        if (orderUniqueIds && orderUniqueIds.length) {
            filters.push({ order_unique_id: { in: orderUniqueIds } });
        }
        if (filters.length > 0) {
            whereClause.OR = filters;
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                customer: {
                    include: { address: true }
                },
                batchAllocations: {
                    include: {
                        product: {
                            select: { id: true, name: true, price_per_kg: true }
                        },
                        batch: true
                    }
                },
                orderDateConfirmation: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return new ApiResponse(HttpStatusCodes.OK, 'Order allocations fetched successfully', orders);
    },

    createOrderByAdmin: async function (payload: {
        customer: Customer,
        address: Address,
        items: Array<{ productId: number, quantity: number }>,
        maxDateRequired: Date
    }) {
        const { customer, address, items, maxDateRequired } = payload;

        // Validate inputs
        if (!items || items.length === 0) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'At least one product item is required');
        }

        if (!(maxDateRequired instanceof Date) || isNaN(maxDateRequired.getTime())) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Please provide a valid date for maximum delivery date');
        }

        const now = new Date();
        if (maxDateRequired < now) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Please provide a date in the future for delivery date');
        }

        // Validate customer and address
        validateCustomer(customer);
        validateAddress(address);

        // Check if customer already exists by mobile number
        let existingCustomer = await prisma.customer.findFirst({
            where: {
                mobile_number: customer.mobile,
                is_active: true
            },
            include: { address: true }
        });

        let customerId: number;
        let addressId: number;

        if (existingCustomer) {
            // Use existing customer
            customerId = existingCustomer.id;
            addressId = existingCustomer.fk_id_address;

            // Optionally update customer if different
            if (customer.name !== existingCustomer.name || customer.email !== existingCustomer.email) {
                await prisma.customer.update({
                    where: { id: customerId },
                    data: {
                        name: customer.name,
                        email: customer.email || null
                    }
                });
            }

            // Check if address needs update
            const addressChanged =
                address.addressLine1 !== existingCustomer.address.address_line ||
                address.city !== existingCustomer.address.city ||
                address.district !== existingCustomer.address.district ||
                address.pinCode !== existingCustomer.address.pin_code;

            if (addressChanged) {
                await prisma.address.update({
                    where: { id: addressId },
                    data: {
                        address_line: address.addressLine1,
                        city: address.city,
                        district: address.district,
                        pin_code: address.pinCode
                    }
                });
            }
        } else {
            // Create new address and customer
            const newAddress = await prisma.address.create({
                data: {
                    address_line: address.addressLine1,
                    city: address.city,
                    district: address.district,
                    pin_code: address.pinCode
                }
            });
            addressId = newAddress.id;

            const newCustomer = await prisma.customer.create({
                data: {
                    name: customer.name,
                    email: customer.email || null,
                    mobile_number: customer.mobile,
                    fk_id_address: addressId,
                    is_active: true
                }
            });
            customerId = newCustomer.id;
        }

        // Build quantity requirement map
        let quantityRequirement = new Map();
        items.forEach((item) => {
            if (!quantityRequirement.has(item.productId)) {
                quantityRequirement.set(item.productId, 0);
            }
            let currQuantity = quantityRequirement.get(item.productId) + item.quantity;
            quantityRequirement.set(item.productId, currQuantity);
        });

        // Get available batches for the products
        let availableBatches = await prisma.stockBatch.findMany({
            where: {
                fk_id_product: {
                    in: items.map(item => item.productId)
                },
                is_active: true
            },
            orderBy: { end_date: 'asc' }
        });

        // Check if we have required quantity
        let hasRequiredQuantity = this.checkIfHasRequiredQuantity(availableBatches, quantityRequirement);
        if (!hasRequiredQuantity) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Required quantity is not yet available. Please try again later');
        }

        // Get earliest delivery date
        let earliestDeliveryDate = this.getEarliestDeliveryDate(availableBatches, quantityRequirement, maxDateRequired);
        let canProvideInRequiredTime = earliestDeliveryDate <= maxDateRequired.getTime();

        // Get order confirmation options
        let orderDateConfirmationOptions = await prisma.orderDateConfirmationOption.findMany({
            where: {
                OR: [
                    {
                        label: {
                            contains: 'approved_by_admin',
                            mode: 'insensitive'
                        }
                    },
                    {
                        label: {
                            contains: 'approval_pending_by_customer',
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        });

        // For admin-created orders, set to approved by admin by default if can provide in time
        let approvedOption = orderDateConfirmationOptions.find((option) => option.label.toLowerCase().includes('approved'));
        let pendingOption = orderDateConfirmationOptions.find((option) => option.label.toLowerCase().includes('pending'));

        // Create the order (without cart)
        let createdOrder = await prisma.order.create({
            data: {
                max_date_requsted_by_customer: maxDateRequired,
                delivery_date: earliestDeliveryDate,
                is_active: true,
                is_created_by_admin: true,
                order_status: ORDER_STATUS.confirmedByAdmin.value,
                order_unique_id: generateOrderUniqueId(customer.mobile, maxDateRequired),
                fk_id_customer: customerId,
                fk_id_order_date_confirmation: canProvideInRequiredTime ? (approvedOption?.id || 3) : (pendingOption?.id || 1),
                fk_id_created_through_cart: null // No cart for admin orders
            }
        });

        if (!canProvideInRequiredTime) {
            return new ApiResponse(HttpStatusCodes.OK,
                'Order could not be processed for the given date. Please confirm with given date for delivery', createdOrder);
        }

        // Create order batch allocations
        await this.createOrderBatchesForAdmin(availableBatches, items, createdOrder);

        return new ApiResponse(HttpStatusCodes.OK, 'Order placed successfully by admin', createdOrder);
    },

    createOrderBatchesForAdmin: async function (
        availableBatches: Array<StockBatch>,
        items: Array<{ productId: number, quantity: number }>,
        createdOrder: Order
    ) {
        let orderBatches: Array<{
            fk_id_order: number;
            fk_id_product: number;
            fk_id_batch: number;
            quantity_allocated: number;
        }> = [];

        items.forEach((item) => {
            let productId = item.productId;
            let requiredQuantity = item.quantity;

            for (let i = 0; i < availableBatches.length; i++) {
                let batch = availableBatches[i];
                let currOrderBatch = {
                    fk_id_order: createdOrder.id,
                    fk_id_product: productId,
                    fk_id_batch: 0,
                    quantity_allocated: 0
                };

                if (batch.fk_id_product === productId) {
                    let remainingQuantity = batch.quantity_produced - batch.quantity_allocated;
                    if (requiredQuantity <= 0) {
                        break;
                    }
                    if (remainingQuantity >= requiredQuantity) {
                        currOrderBatch.fk_id_batch = batch.id;
                        currOrderBatch.quantity_allocated = requiredQuantity;
                        batch.quantity_allocated += requiredQuantity;
                        requiredQuantity = 0;
                    } else {
                        currOrderBatch.fk_id_batch = batch.id;
                        currOrderBatch.quantity_allocated = remainingQuantity;
                        batch.quantity_allocated += remainingQuantity;
                        requiredQuantity -= remainingQuantity;
                    }
                }
                if (currOrderBatch.quantity_allocated > 0) {
                    orderBatches.push(currOrderBatch);
                }
            }
        });

        await prisma.orderBatchAllocation.createMany({
            data: orderBatches
        });

        for (let batch of availableBatches) {
            await prisma.stockBatch.update({
                where: { id: batch.id },
                data: { quantity_allocated: batch.quantity_allocated }
            });
        }
    }
};

export default OrderService;