import { Router } from 'express';
import { Product } from '../models/Product.js';

const router = Router();
const allowedFilters = ['incarnation', 'status', 'category', 'drop'];

router.get('/', async (req, res, next) => {
  try {
    const query = {};

    for (const key of allowedFilters) {
      const value = req.query[key];
      if (typeof value === 'string' && value && value !== 'all') {
        query[key] = value;
      }
    }

    const products = await Product.find(query).sort({ featured: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: products.map(normalizeProduct) });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: normalizeProduct(product) });
  } catch (error) {
    next(error);
  }
});

function normalizeProduct(product) {
  return {
    ...product,
    _id: product._id.toString(),
    createdAt: product.createdAt?.toISOString?.() ?? product.createdAt,
    updatedAt: product.updatedAt?.toISOString?.() ?? product.updatedAt,
  };
}

export default router;
