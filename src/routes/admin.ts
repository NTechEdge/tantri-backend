import { Router } from 'express';
import { requireAdmin } from '../lib/auth';
import { DEFAULT_PAYMENTS, getPayments, shapeProduct } from '../lib/store-helpers';
import { Offer, Order, Product, Setting, User } from '../models';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [allOrders, todayOrders, pending, customers, lowStock, recent, top] = await Promise.all([
      Order.find({ status: { $ne: 'cancelled' } }).select('total createdAt').lean(),
      Order.find({ status: { $ne: 'cancelled' }, createdAt: { $gte: startOfToday } }).select('total').lean(),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'customer' }),
      Product.find({ active: true, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(10).select('name stock').lean(),
      Order.find().sort({ createdAt: -1 }).limit(8).select('orderNo name total status createdAt').lean(),
      Product.find({ active: true }).sort({ sold: -1 }).limit(5).select('name sold').lean(),
    ]);

    const revenue = allOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);

    const dayMap = new Map<string, { v: number; n: number }>();
    for (let i = 6; i >= 0; i--) {
      dayMap.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), { v: 0, n: 0 });
    }
    for (const o of allOrders) {
      if (o.createdAt && new Date(o.createdAt) >= sevenDaysAgo) {
        const entry = dayMap.get(new Date(o.createdAt).toISOString().slice(0, 10));
        if (entry) {
          entry.v += Number(o.total || 0);
          entry.n += 1;
        }
      }
    }

    res.json({
      revenue,
      orders: allOrders.length,
      today_revenue: todayRevenue,
      today_orders: todayOrders.length,
      pending,
      customers,
      days: Array.from(dayMap.entries()).map(([d, data]) => ({ d, ...data })),
      low_stock: lowStock.map((p) => ({ name: p.name, stock: p.stock })),
      recent: recent.map((o) => ({
        order_no: o.orderNo,
        name: o.name,
        total: o.total,
        status: o.status,
        created_at: o.createdAt,
      })),
      top: top.map((p) => ({ name: p.name, sold: p.sold })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/products', async (_req, res, next) => {
  try {
    const rows = await Product.find().populate('categoryId', 'name slug').sort({ createdAt: -1 }).lean();
    res.json(rows.map((p) => shapeProduct(p as never)));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name || Number(b.price) <= 0) {
      return res.status(400).json({ error: 'Name and valid price required' });
    }
    let slug = slugify(b.name);
    if (await Product.exists({ slug })) slug += '-' + Date.now().toString(36);

    const created = await Product.create({
      slug,
      name: String(b.name),
      nameBn: String(b.name_bn || ''),
      categoryId: b.category_id,
      description: String(b.description || ''),
      descriptionBn: String(b.description_bn || ''),
      price: Number(b.price),
      salePrice: b.sale_price ? Number(b.sale_price) : null,
      stock: Number(b.stock || 0),
      sku: String(b.sku || 'TN-' + Date.now().toString().slice(-5)),
      images: Array.isArray(b.images) ? b.images : [],
      sizes: Array.isArray(b.sizes) ? b.sizes : [],
      colors: Array.isArray(b.colors) ? b.colors : [],
      material: String(b.material || ''),
      origin: String(b.origin || 'Made in Bangladesh'),
      featured: Boolean(b.featured),
      active: b.active !== false && b.active !== 0,
    });
    res.json({ ok: true, id: String(created._id) });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/products/:id', async (req, res, next) => {
  try {
    const b = req.body;
    await Product.findByIdAndUpdate(req.params.id, {
      name: String(b.name),
      nameBn: String(b.name_bn || ''),
      categoryId: b.category_id,
      description: String(b.description || ''),
      descriptionBn: String(b.description_bn || ''),
      price: Number(b.price),
      salePrice: b.sale_price ? Number(b.sale_price) : null,
      stock: Number(b.stock || 0),
      sku: String(b.sku || ''),
      images: Array.isArray(b.images) ? b.images : [],
      sizes: Array.isArray(b.sizes) ? b.sizes : [],
      colors: Array.isArray(b.colors) ? b.colors : [],
      material: String(b.material || ''),
      origin: String(b.origin || 'Made in Bangladesh'),
      featured: Boolean(b.featured),
      active: b.active !== false && b.active !== 0,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const hasOrders = await Order.exists({ 'items.productId': req.params.id });
    if (hasOrders) {
      await Product.findByIdAndUpdate(req.params.id, { active: false });
      return res.json({ ok: true, archived: true });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/orders', async (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    const orders = await Order.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(300).lean();
    res.json(
      orders.map((o) => ({
        id: String(o._id),
        order_no: o.orderNo,
        name: o.name,
        email: o.email,
        phone: o.phone,
        address: o.address,
        district: o.district,
        note: o.note,
        payment_method: o.paymentMethod,
        payment_ref: o.paymentRef,
        payment_sender: o.paymentSender,
        payment_status: o.paymentStatus,
        status: o.status,
        subtotal: o.subtotal,
        discount: o.discount,
        shipping: o.shipping,
        total: o.total,
        coupon: o.coupon,
        created_at: o.createdAt,
        items: o.items,
      }))
    );
  } catch (err) {
    next(err);
  }
});

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

adminRouter.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const i of order.items) {
        await Product.findByIdAndUpdate(i.productId, { $inc: { stock: i.qty, sold: -i.qty } });
      }
    } else if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const i of order.items) {
        await Product.findByIdAndUpdate(i.productId, { $inc: { stock: -i.qty, sold: i.qty } });
      }
    }

    order.status = status;
    await order.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const PAY_STATUSES = ['unpaid', 'pending', 'paid', 'failed'] as const;

adminRouter.put('/orders/:id/payment', async (req, res, next) => {
  try {
    const { payment_status } = req.body;
    if (!PAY_STATUSES.includes(payment_status)) return res.status(400).json({ error: 'Bad status' });
    await Order.findByIdAndUpdate(req.params.id, { paymentStatus: payment_status });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/offers', async (_req, res, next) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 }).lean();
    res.json(
      offers.map((o) => ({
        id: String(o._id),
        code: o.code,
        title: o.title,
        title_bn: o.titleBn,
        type: o.type,
        value: o.value,
        min_order: o.minOrder,
        max_discount: o.maxDiscount,
        expires_at: o.expiresAt,
        usage_limit: o.usageLimit,
        used: o.used,
        active: o.active,
        show_banner: o.showBanner,
      }))
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/offers', async (req, res, next) => {
  try {
    const b = req.body;
    const code = String(b.code || '').trim().toUpperCase();
    const value = Number(b.value || 0);
    if (!code || value <= 0) return res.status(400).json({ error: 'Code and value required' });

    await Offer.create({
      code,
      title: String(b.title || ''),
      titleBn: String(b.title_bn || ''),
      type: b.type === 'flat' ? 'flat' : 'percent',
      value,
      minOrder: Number(b.min_order || 0),
      maxDiscount: b.max_discount ? Number(b.max_discount) : null,
      expiresAt: b.expires_at ? new Date(b.expires_at) : null,
      usageLimit: b.usage_limit ? Number(b.usage_limit) : null,
      active: b.active !== false && b.active !== 0,
      showBanner: Boolean(b.show_banner),
    });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Coupon code already exists' });
  }
});

adminRouter.put('/offers/:id', async (req, res, next) => {
  try {
    const b = req.body;
    await Offer.findByIdAndUpdate(req.params.id, {
      code: String(b.code || '').trim().toUpperCase(),
      title: String(b.title || ''),
      titleBn: String(b.title_bn || ''),
      type: b.type === 'flat' ? 'flat' : 'percent',
      value: Number(b.value || 0),
      minOrder: Number(b.min_order || 0),
      maxDiscount: b.max_discount ? Number(b.max_discount) : null,
      expiresAt: b.expires_at ? new Date(b.expires_at) : null,
      usageLimit: b.usage_limit ? Number(b.usage_limit) : null,
      active: b.active !== false && b.active !== 0,
      showBanner: Boolean(b.show_banner),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/offers/:id', async (req, res, next) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/customers', async (_req, res, next) => {
  try {
    const [users, orderStats] = await Promise.all([
      User.find({ role: 'customer' }).sort({ createdAt: -1 }).lean(),
      Order.aggregate([
        {
          $group: {
            _id: '$userId',
            orders: { $sum: 1 },
            spent: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
          },
        },
      ]),
    ]);
    const statMap = new Map(orderStats.map((s) => [String(s._id), s]));
    res.json(
      users.map((u) => {
        const st = statMap.get(String(u._id));
        return {
          id: String(u._id),
          email: u.email,
          name: u.name || '',
          phone: u.phone || '',
          orders: st ? st.orders : 0,
          spent: st ? st.spent : 0,
          created_at: u.createdAt,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/settings', async (_req, res, next) => {
  try {
    const [rows, payments] = await Promise.all([Setting.find().lean(), getPayments()]);
    const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ ...obj, payments });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/settings', async (req, res, next) => {
  try {
    const b = req.body;
    if (Array.isArray(b.payments)) {
      const clean = b.payments
        .filter((p: { id?: string }) => DEFAULT_PAYMENTS.some((d) => d.id === p.id))
        .map((p: { id: string; enabled?: boolean; number?: string; qr?: string }) => ({
          id: p.id,
          enabled: p.enabled ? 1 : 0,
          number: String(p.number || '').slice(0, 40),
          qr: String(p.qr || '').slice(0, 200),
        }));
      await Setting.updateOne({ key: 'payments' }, { $set: { key: 'payments', value: clean } }, { upsert: true });
    }
    for (const k of ['shipping_dhaka', 'shipping_outside', 'free_over', 'phone']) {
      if (k in b) {
        await Setting.updateOne({ key: k }, { $set: { key: k, value: String(b[k]) } }, { upsert: true });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
