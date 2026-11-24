import { Router } from 'express';
import mongoose from 'mongoose';
import { calcCoupon, getPayments, getSetting, shapeProduct } from '../lib/store-helpers';
import { Category, Offer, Product } from '../models';

export const catalogRouter = Router();

catalogRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
  });
});

catalogRouter.get('/config', async (_req, res, next) => {
  try {
    const [shippingDhaka, shippingOutside, freeOver, phone, allPayments] = await Promise.all([
      getSetting('shipping_dhaka', '70'),
      getSetting('shipping_outside', '130'),
      getSetting('free_over', '3000'),
      getSetting('phone', '+880 1XXX-XXXXXX'),
      getPayments(),
    ]);
    const payments = allPayments.filter(
      (p) => p.enabled && (p.id === 'cod' || (p.id === 'bangla_qr' ? p.qr : p.number || p.qr))
    );
    res.json({
      shipping_dhaka: Number(shippingDhaka),
      shipping_outside: Number(shippingOutside),
      free_shipping_over: Number(freeOver),
      support_phone: String(phone),
      payments,
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    const cats = await Category.find().lean();
    const counts = await Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), Number(c.count)]));
    res.json(
      cats.map((c) => ({
        id: String(c._id),
        slug: c.slug,
        name: c.name,
        name_bn: c.nameBn || '',
        description: c.description || '',
        image: c.image || '',
        count: countMap.get(String(c._id)) || 0,
      }))
    );
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products', async (req, res, next) => {
  try {
    const category = String(req.query.category || '');
    const q = String(req.query.q || '');
    const sort = String(req.query.sort || '');
    const featured = req.query.featured;
    const limit = Math.min(Number(req.query.limit || 60), 100);

    const filter: Record<string, unknown> = { active: true };
    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (!cat) return res.json([]);
      filter.categoryId = cat._id;
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { nameBn: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (featured === '1' || featured === 'true') filter.featured = true;

    let rows = await Product.find(filter).populate('categoryId', 'name slug').limit(limit).lean();
    if (sort === 'popular') rows = rows.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    else if (sort === 'price_asc') rows = rows.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    else if (sort === 'price_desc') rows = rows.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    else rows = rows.sort((a, b) => String(b._id).localeCompare(String(a._id)));

    res.json(rows.map((p) => shapeProduct(p as never)));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const prod = await Product.findOne({ slug: req.params.slug, active: true })
      .populate('categoryId', 'name slug')
      .lean();
    if (!prod) return res.status(404).json({ error: 'Not found' });

    const related = await Product.find({
      active: true,
      categoryId: prod.categoryId,
      _id: { $ne: prod._id },
    })
      .populate('categoryId', 'name slug')
      .limit(4)
      .lean();

    res.json({
      ...shapeProduct(prod as never),
      related: related.map((r) => shapeProduct(r as never)),
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/offers/banner', async (_req, res, next) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      active: true,
      showBanner: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
    }).lean();

    res.json(
      offers.map((o) => ({
        code: o.code,
        title: o.title || '',
        title_bn: o.titleBn || '',
        type: o.type,
        value: o.value,
        min_order: o.minOrder,
      }))
    );
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/coupons/validate', async (req, res, next) => {
  try {
    const result = await calcCoupon(req.body.code, Number(req.body.subtotal || 0));
    if ('error' in result) return res.status(400).json({ error: result.error });
    res.json({ discount: result.discount, title: result.offer?.title || '' });
  } catch (err) {
    next(err);
  }
});
