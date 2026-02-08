import { prisma } from "../prisma"
import ApiResponse from "../utils/api-response";
import { ORDER_STATUS } from "../utils/constants";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";
import RestError from "../utils/rest-error";

const AdminService = {

    confirmOrderByAdmin: async function(orderId: number) {

        let order = await prisma.order.findUnique({
            where: {
                id: orderId
            }
        });
        if(!order) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'Order not found !!');
        }
        if(order.order_status !== ORDER_STATUS.confirmedByCustomer.value) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Order is not confirmed by customer yet !!');
        }
        order.order_status = ORDER_STATUS.confirmedByAdmin.value;
        await prisma.order.update({
            where: {
                id: orderId
            },
            data: order
        });
        return new ApiResponse(HttpStatusCodes.OK, 'Order confirmed by admin successfully', order);
    },

    revertConfirmationByAdmin: async function(orderId: number) {

        let order = await prisma.order.findUnique({
            where: {
                id: orderId
            }
        });
        if(!order) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'Order not found !!');
        }
        if(order.order_status !== ORDER_STATUS.confirmedByAdmin.value) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Order is not confirmed by admin yet !!');
        }
        order.order_status = ORDER_STATUS.pending.value;
        await prisma.order.update({
            where: {
                id: orderId
            },
            data: order
        });
        return new ApiResponse(HttpStatusCodes.OK, 'Order confirmation by admin reverted successfully', order);
    },

    cancelOrderByAdmin: async function(orderId: number) {

        let order = await prisma.order.findUnique({
            where: {
                id: orderId
            }
        });
        if(!order) {
            throw new RestError(HttpStatusCodes.NOT_FOUND, 'Order not found !!');
        }
        if(order.order_status === ORDER_STATUS.delivered.value) {
            throw new RestError(HttpStatusCodes.BAD_REQUEST, 'Delivered orders cannot be cancelled !!');
        }
        order.order_status = ORDER_STATUS.cancelled.value;
        await prisma.order.update({
            where: {
                id: orderId
            },
            data: order
        });
        return new ApiResponse(HttpStatusCodes.OK, 'Order cancelled by admin successfully', order);
    }
}