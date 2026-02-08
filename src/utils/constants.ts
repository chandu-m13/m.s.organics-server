// constants.ts
export const SHIPPING_TIME = 2; // in days
export const MIN_USER_NAME_LENGTH = 3;
export const MAX_USER_NAME_LENGTH = 50;
export const MIN_ADDRESS_LINE_LENGTH = 5;
export const MIN_DESC_LENGTH = 5;
export const MAX_DESC_LENGTH = 300;
export const TOP_K_BEST_SELLERS = 5;
export const FUEL_TYPES = {
    petrol: {
        value: 1,
        label: 'Petrol'
    },
    diesel: {
        value: 2,
        label: 'Diesel'
    },
    electric: {
        value: 3,
        label: 'Electric'
    },
    hybrid: {
        value: 4,
        label: 'Hybrid'
    },
    cng: {
        value: 5,
        label: 'CNG'
    },
    others: {
        value: 6,
        label: 'Others'
    }
}

export const ORDER_STATUS = {
    pending: {
        value: 1,
        label: 'Pending'
    },
    confirmedByCustomer: {
        value: 2,
        label: 'Confirmed By Customer'
    },
    confirmedByAdmin: {
        value: 2,
        label: 'Confirmed By Admin'
    },
    shipped: {
        value: 3,
        label: 'Shipped'
    },
    delivered: {
        value: 4,
        label: 'Delivered'
    },
    cancelled: {
        value: 5,
        label: 'Cancelled'
    }
}
export const MAX_LIMIT_PER_PAGE = 25;
