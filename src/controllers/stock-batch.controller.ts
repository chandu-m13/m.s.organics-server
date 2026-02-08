import { Request, Response } from 'express';
import StockBatchService from '../services/stock-batch.service';

const StockBatchController = {
    fetch: async function (req: Request, res: Response) {
        const { batchCode, productIds, fromStartDate, toStartDate, fromEndDate, toEndDate, onlyActive, limit, offset, sort } = req.query as any;
        const parsedProductIds = typeof productIds === 'string' && productIds.length
            ? productIds.split(',').map((id: string) => Number(id)).filter((n: number) => !isNaN(n))
            : undefined;
        const onlyActiveBool = onlyActive === undefined ? true : String(onlyActive).toLowerCase() !== 'false';

        // Parse sort - expected format: JSON array like [{"field":"end_date","order":"asc"}]
        let sortArray: Array<{ field: string; order: 'asc' | 'desc' }> | undefined;
        if (sort) {
            try {
                const parsed = JSON.parse(sort);
                if (Array.isArray(parsed)) {
                    sortArray = parsed;
                }
            } catch (e) {
                console.log('Failed to parse sort param, using default');
            }
        }

        return StockBatchService.fetch({
            batchCode,
            productIds: parsedProductIds,
            fromStartDate,
            toStartDate,
            fromEndDate,
            toEndDate,
            onlyActive: onlyActiveBool,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            sort: sortArray
        });
    },

    count: async function (req: Request, res: Response) {
        const { batchCode, productIds, fromStartDate, toStartDate, fromEndDate, toEndDate, onlyActive } = req.query as any;
        const parsedProductIds = typeof productIds === 'string' && productIds.length
            ? productIds.split(',').map((id: string) => Number(id)).filter((n: number) => !isNaN(n))
            : undefined;
        const onlyActiveBool = onlyActive === undefined ? true : String(onlyActive).toLowerCase() !== 'false';
        return StockBatchService.count({
            batchCode,
            productIds: parsedProductIds,
            fromStartDate,
            toStartDate,
            fromEndDate,
            toEndDate,
            onlyActive: onlyActiveBool
        });
    },

    create: async function (req: Request, res: Response) {
        const { fk_id_product, quantity_produced, start_date, end_date, price_per_kg } = req.body;
        return StockBatchService.create({ fk_id_product, quantity_produced, start_date, end_date, price_per_kg });
    },

    updateById: async function (req: Request, res: Response) {
        const { id } = req.params;
        const { fk_id_product, quantity_produced, quantity_allocated, end_date } = req.body;
        return StockBatchService.updateById(Number(id), { fk_id_product, quantity_produced, quantity_allocated, end_date });
    },

    deleteById: async function (req: Request, res: Response) {
        const { id } = req.params;
        return StockBatchService.deleteById(Number(id));
    }
};

export default StockBatchController;


