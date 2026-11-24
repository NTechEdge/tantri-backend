export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'admin';
}

export interface PaymentMethodConfig {
  id: 'cod' | 'bkash' | 'rocket' | 'nagad' | 'bangla_qr';
  enabled: boolean | number;
  label_en: string;
  label_bn: string;
  number: string;
  qr: string;
}

export interface ProductDTO {
  id: string;
  slug: string;
  name: string;
  name_bn: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  description: string;
  description_bn: string;
  price: number;
  sale_price: number | null;
  stock: number;
  sku: string;
  images: string[];
  sizes: string[];
  colors: string[];
  material: string;
  origin: string;
  featured: boolean;
  active: boolean;
  sold: number;
}
