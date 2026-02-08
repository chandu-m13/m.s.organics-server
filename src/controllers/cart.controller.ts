import { Request, Response } from 'express';
import CartService from '../services/cart.service';

const CartController = {
    createCart: async function(req: Request, res: Response) {
        const { cartItems, address, customer } = req.body;
        return CartService.createCart(cartItems, address, customer);
    },

    fetchCart: async function(req: Request, res: Response) {
        const { cartUniqueId } = req.query;
        return CartService.fetchCart(cartUniqueId as string);
    },

    deleteCart: async function(req: Request, res: Response) {
        const { cartUniqueId } = req.body;
        return CartService.deleteCart(cartUniqueId);
    }
};

export default CartController;
