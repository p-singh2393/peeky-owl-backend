import { Router } from 'express';
import { Order }   from '../models/Order.js';
import { Product } from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { items, shippingAddress, guestEmail, paymentMethod, paymentId } = req.body;

    if (!Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Items and shipping address are required' });
    }

    const normalizedItems = items.map(item => ({
      ...item,
      qty: Number(item.qty ?? 1),
    }));
    const total = normalizedItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    // Atomically decrement stock for each item.
    // On failure, roll back already-decremented items.
    const decremented = [];
    for (const item of normalizedItems) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true },
      );
      if (!product) {
        if (decremented.length > 0) {
          await Product.bulkWrite(
            decremented.map(({ productId, qty }) => ({
              updateOne: { filter: { _id: productId }, update: { $inc: { stock: qty } } },
            })),
          );
        }
        return res.status(409).json({
          success: false,
          message: `"${item.name}" is out of stock or has insufficient quantity available.`,
        });
      }
      decremented.push({ productId: item.productId, qty: item.qty });
      // Auto-update product status based on new stock level
      const newStatus = product.stock === 0 ? 'soldout'
        : product.stock <= 5 && product.status === 'available' ? 'limited'
        : null;
      if (newStatus) {
        await Product.updateOne({ _id: product._id }, { status: newStatus });
      }
    }

    // Attach the authenticated user if logged in (token is optional for this route)
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7) : null;
    let userId;
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(token, process.env.JWT_SECRET);
        userId = payload.sub;
      } catch { /* guest order */ }
    }

    const order = await Order.create({
      items:         normalizedItems,
      shippingAddress,
      guestEmail,
      total,
      paymentMethod: paymentMethod ?? 'cod',
      paymentId:     paymentId ?? '',
      ...(userId ? { user: userId } : {}),
    });

    res.status(201).json({ success: true, data: normalizeOrder(order.toObject()) });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orders.map(normalizeOrder) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: normalizeOrder(order) });
  } catch (error) {
    next(error);
  }
});

function normalizeOrder(order) {
  return {
    ...order,
    _id: order._id.toString(),
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
  };
}

export default router;
