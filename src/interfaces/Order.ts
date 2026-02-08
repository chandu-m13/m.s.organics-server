export interface Order {
    id: number;
    order_unique_id: string;
    is_active: boolean;
    max_date_required: Date;
    fk_id_customer: number;
    fk_id_order_date_confirmation: number;
    fk_id_created_through_cart: number;
}