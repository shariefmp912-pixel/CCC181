const { z } = require('zod');

const loginSchema = z.object({ u: z.string().min(1), p: z.string().min(1) });
const purchaseSchema = z.object({ item: z.string().min(1), qty: z.number().int().positive(), supplier: z.string().min(1) });
const updatePurchaseSchema = z.object({ status: z.string().min(1) });
const deliverySchema = z.object({ customer: z.string().min(1), item: z.string().min(1), driver: z.string().min(1) });
const updateDeliverySchema = z.object({ status: z.string().min(1) });
const inventorySchema = z.object({ item: z.string().min(1), amount: z.number().int() });

function validate(schema) {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req.body);
            req.validated = parsed;
            next();
        } catch (e) {
            next({ status: 400, message: e.errors ? e.errors.map(x => x.message).join(', ') : 'Validation error' });
        }
    };
}

module.exports = {
    loginSchema,
    validate,
    purchaseSchema,
    updatePurchaseSchema,
    deliverySchema,
    updateDeliverySchema,
    inventorySchema
};