import { Offer, Setting } from '../models';
import type { PaymentMethodConfig, ProductDTO } from '../types';

export const DEFAULT_PAYMENTS: PaymentMethodConfig[] = [
  { id: 'cod', enabled: 1, label_en: 'Cash on Delivery', label_bn: 'ক্যাশ অন ডেলিভারি', number: '', qr: '' },
  { id: 'bkash', enabled: 1, label_en: 'bKash Merchant', label_bn: 'বিকাশ মার্চেন্ট', number: '01XXXXXXXXX', qr: '' },
  { id: 'rocket', enabled: 1, label_en: 'Rocket Merchant', label_bn: 'রকেট মার্চেন্ট', number: '01XXXXXXXXX-X', qr: '' },
  { id: 'nagad', enabled: 1, label_en: 'Nagad', label_bn: 'নগদ', number: '01XXXXXXXXX', qr: '' },
  { id: 'bangla_qr', enabled: 1, label_en: 'Bangla QR', label_bn: 'বাংলা কিউআর', number: '', qr: '' },
];

export async function getSetting<T = string>(key: string, fallback: T): Promise<T> {
  const row = await Setting.findOne({ key }).lean();
  return row ? (row.value as T) : fallback;
}

export async function getPayments(): Promise<PaymentMethodConfig[]> {
  const saved = await getSetting<Partial<PaymentMethodConfig>[]>('payments', []);
  return DEFAULT_PAYMENTS.map((d) => ({
    ...d,
    ...(Array.isArray(saved) ? saved.find((x) => x.id === d.id) || {} : {}),
  }));
}

export function shapeProduct(
  p: Record<string, unknown> & {
    _id: unknown;
    categoryId?: { _id?: unknown; name?: string; slug?: string } | unknown;
  }
): ProductDTO {
  const catObj =
    p.categoryId && typeof p.categoryId === 'object' && 'name' in p.categoryId
      ? (p.categoryId as { _id?: unknown; name?: string; slug?: string })
      : null;

  return {
    id: String(p._id),
    slug: String(p.slug || ''),
    name: String(p.name || ''),
    name_bn: String(p.nameBn || ''),
    category_id: catObj ? String(catObj._id) : String(p.categoryId || ''),
    category_name: catObj?.name || '',
    category_slug: catObj?.slug || '',
    description: String(p.description || ''),
    description_bn: String(p.descriptionBn || ''),
    price: Number(p.price || 0),
    sale_price: p.salePrice != null ? Number(p.salePrice) : null,
    stock: Number(p.stock || 0),
    sku: String(p.sku || ''),
    images: Array.isArray(p.images) ? (p.images as string[]) : [],
    sizes: Array.isArray(p.sizes) ? (p.sizes as string[]) : [],
    colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
    material: String(p.material || ''),
    origin: String(p.origin || 'Made in Bangladesh'),
    featured: Boolean(p.featured),
    active: p.active !== false,
    sold: Number(p.sold || 0),
  };
}

export async function calcCoupon(code: string | null | undefined, subtotal: number) {
  if (!code) return { discount: 0, offer: null };
  const o = await Offer.findOne({ code: code.trim().toUpperCase(), active: true });
  if (!o) return { error: 'Invalid coupon code' };
  if (o.expiresAt && o.expiresAt < new Date()) return { error: 'This coupon has expired' };
  if (o.usageLimit && o.used >= o.usageLimit) return { error: 'Coupon usage limit reached' };
  if (subtotal < o.minOrder) return { error: `Minimum order Tk ${o.minOrder} required` };

  let d = o.type === 'percent' ? (subtotal * o.value) / 100 : o.value;
  if (o.maxDiscount) d = Math.min(d, o.maxDiscount);
  return { discount: Math.round(Math.min(d, subtotal)), offer: o };
}

export async function shippingFor(district: string, subtotal: number): Promise<number> {
  const freeOver = Number(await getSetting('free_over', '3000'));
  if (subtotal >= freeOver) return 0;
  const dhaka = Number(await getSetting('shipping_dhaka', '70'));
  const outside = Number(await getSetting('shipping_outside', '130'));
  return /dhaka/i.test(district) ? dhaka : outside;
}
