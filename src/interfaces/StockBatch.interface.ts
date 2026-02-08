export interface StockBatch {
    id: number;
    fk_id_product: number;
    quantity_produced: number;
    quantity_allocated: number;
    end_date: Date;
}