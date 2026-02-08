export interface OrderSearchFilter {
    orderUniqueId?: string;
    customerName?: string;
    customerEmail?: string;
    customerMobile?: string;
    deliveryDateFrom?: Date;
    deliveryDateTo?: Date;
}
