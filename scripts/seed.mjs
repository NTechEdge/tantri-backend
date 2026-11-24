import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tantri';

const categorySchema = new mongoose.Schema(
  { slug: { type: String, unique: true }, name: String, nameBn: String, description: String, image: String },
  { timestamps: true }
);
const productSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true },
    name: String,
    nameBn: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    description: String,
    descriptionBn: String,
    price: Number,
    salePrice: Number,
    stock: Number,
    sku: String,
    images: [String],
    sizes: [String],
    colors: [String],
    material: String,
    origin: String,
    featured: Boolean,
    active: { type: Boolean, default: true },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const offerSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    title: String,
    titleBn: String,
    type: String,
    value: Number,
    minOrder: Number,
    maxDiscount: Number,
    used: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    showBanner: Boolean,
  },
  { timestamps: true }
);
const settingSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

const CATEGORIES = [
  ['lungi', 'Lungi', 'লুঙ্গি', "Handloom lungis woven by Bengal's master weavers", '/img/products/rajshahi-maroon-check-lungi.svg'],
  ['gamcha', 'Gamcha', 'গামছা', 'The iconic checkered Bengali towel', '/img/products/rangpur-classic-red-gamcha.svg'],
  ['tshirt', 'T-Shirts', 'টি-শার্ট', 'Heritage-print premium cotton tees', '/img/products/alpona-black-tshirt.svg'],
];

const PRODUCTS = [
  ['rajshahi-maroon-check-lungi', 'Rajshahi Maroon Check Lungi', 'রাজশাহী মেরুন চেক লুঙ্গি', 'lungi', 1450, 1190, 40, 'The all-time classic. A deep maroon check woven on traditional handlooms in Rajshahi.', 'চিরকালীন ক্লাসিক। রাজশাহীর তাঁতে বোনা গাঢ় মেরুন চেক লুঙ্গি।', true, '100% handloom cotton', ['Standard (2.25 yd)', 'Large (2.5 yd)'], ['Maroon']],
  ['tangail-indigo-check-lungi', 'Tangail Indigo Check Lungi', 'টাঙ্গাইল ইন্ডিগো চেক লুঙ্গি', 'lungi', 1590, null, 30, 'Cool indigo checks with fine golden lines.', 'সোনালি সূক্ষ্ম দাগসহ ঠান্ডা নীল চেক।', true, '100% handloom cotton', ['Standard (2.25 yd)', 'Large (2.5 yd)'], ['Indigo']],
  ['pabna-forest-green-lungi', 'Pabna Forest Green Lungi', 'পাবনা ফরেস্ট গ্রিন লুঙ্গি', 'lungi', 1390, 1250, 26, 'Earthy green and black-lined check from Pabna weavers.', 'পাবনার তাঁতিদের হাতে বোনা সবুজ চেক।', false, '100% cotton', ['Standard (2.25 yd)', 'Large (2.5 yd)'], ['Forest Green']],
  ['sirajganj-sunset-lungi', 'Sirajganj Sunset Lungi', 'সিরাজগঞ্জ সানসেট লুঙ্গি', 'lungi', 1690, null, 18, 'Warm sunset orange mixed with chocolate lines.', 'চকলেট রঙের দাগের সাথে উষ্ণ কমলা লুঙ্গি।', false, 'Cotton-silk blend', ['Standard (2.25 yd)', 'Large (2.5 yd)'], ['Sunset']],
  ['rangpur-classic-red-gamcha', 'Rangpur Classic Red Gamcha', 'রংপুর ক্লাসিক লাল গামছা', 'gamcha', 450, 390, 120, 'The iconic red-and-white Bengali gamcha.', 'বাঙালির চিরচেনা লাল-সাদা গামছা।', true, '100% cotton', ['Regular (1.5 yd)', 'Large (2 yd)'], ['Red & White']],
  ['indigo-white-gamcha', 'Indigo & White Gamcha', 'ইন্ডিগো ও সাদা গামছা', 'gamcha', 480, null, 80, 'A cool indigo twist on the classic gamcha.', 'ক্লাসিক গামছায় ঠান্ডা নীলের ছোঁয়া।', false, '100% cotton', ['Regular (1.5 yd)', 'Large (2 yd)'], ['Indigo & White']],
  ['kushtia-green-gamcha', 'Kushtia Green Check Gamcha', 'কুষ্টিয়া সবুজ চেক গামছা', 'gamcha', 520, 460, 60, 'Fresh green checks from the weavers of Kushtia.', 'কুষ্টিয়ার তাঁতিদের তৈরি সতেজ সবুজ চেক গামছা।', false, '100% cotton', ['Regular (1.5 yd)', 'Large (2 yd)'], ['Green & White']],
  ['alpona-black-tshirt', 'Alpona Heritage T-Shirt — Black', 'আলপনা হেরিটেজ টি-শার্ট — কালো', 'tshirt', 890, 790, 70, 'Premium 180 GSM combed cotton tee with a hand-drawn Alpona motif.', 'হাতে আঁকা আলপনার সোনালি প্রিন্টসহ প্রিমিয়াম ১৮০ জিএসএম কটন টি-শার্ট।', true, '180 GSM combed cotton', ['S', 'M', 'L', 'XL', 'XXL'], ['Black']],
  ['jamdani-maroon-tshirt', 'Jamdani Diamond T-Shirt — Maroon', 'জামদানি ডায়মন্ড টি-শার্ট — মেরুন', 'tshirt', 890, null, 55, 'Inspired by the legendary Dhakai Jamdani.', 'ঢাকাই জামদানি থেকে অনুপ্রাণিত ডায়মন্ড নকশা।', true, '180 GSM combed cotton', ['S', 'M', 'L', 'XL', 'XXL'], ['Maroon']],
  ['kantha-offwhite-tshirt', 'Kantha Stitch T-Shirt — Off-White', 'কাঁথা স্টিচ টি-শার্ট — অফ-হোয়াইট', 'tshirt', 850, null, 60, 'Soft off-white tee with a Nakshi Kantha running-stitch print.', 'নকশি কাঁথার ফোঁড়ের প্রিন্টসহ অফ-হোয়াইট টি-শার্ট।', false, '180 GSM combed cotton', ['S', 'M', 'L', 'XL', 'XXL'], ['Off-White']],
  ['padma-waves-indigo-tshirt', 'Padma Waves T-Shirt — Indigo', 'পদ্মা ঢেউ টি-শার্ট — ইন্ডিগো', 'tshirt', 920, 820, 45, 'The rising sun over the mighty Padma.', 'পদ্মার বুকে উদীয়মান সূর্য গ্রাফিক টি-শার্ট।', false, '180 GSM combed cotton', ['S', 'M', 'L', 'XL', 'XXL'], ['Indigo']],
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const reset = process.argv.includes('--reset');
  if (reset) {
    await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Offer.deleteMany({})]);
  }

  const existing = await Category.countDocuments();
  if (existing > 0 && !reset) {
    console.log('Already seeded (use npm run seed:reset to rebuild)');
    await mongoose.disconnect();
    return;
  }

  const catMap = {};
  for (const [slug, name, nameBn, description, image] of CATEGORIES) {
    const doc = await Category.create({ slug, name, nameBn, description, image });
    catMap[slug] = doc._id;
  }

  for (let i = 0; i < PRODUCTS.length; i++) {
    const [slug, name, nameBn, cat, price, salePrice, stock, description, descriptionBn, featured, material, sizes, colors] =
      PRODUCTS[i];
    await Product.create({
      slug,
      name,
      nameBn,
      categoryId: catMap[cat],
      description,
      descriptionBn,
      price,
      salePrice,
      stock,
      sku: 'TN-' + String(i + 101),
      images: ['/img/products/' + slug + '.svg'],
      sizes,
      colors,
      material,
      origin: 'Made in Bangladesh',
      featured,
      active: true,
    });
  }

  await Offer.insertMany([
    { code: 'WELCOME10', title: 'Welcome offer — 10% off your first order', titleBn: 'স্বাগতম অফার — প্রথম অর্ডারে ১০% ছাড়', type: 'percent', value: 10, minOrder: 1000, maxDiscount: 300, active: true, showBanner: true },
    { code: 'EID200', title: 'Flat Tk 200 off on orders above Tk 2500', titleBn: '৳২,৫০০-এর বেশি অর্ডারে ফ্ল্যাট ৳২০০ ছাড়', type: 'flat', value: 200, minOrder: 2500, active: true, showBanner: true },
  ]);

  for (const [key, value] of [
    ['shipping_dhaka', '70'],
    ['shipping_outside', '130'],
    ['free_over', '3000'],
    ['phone', '+880 1XXX-XXXXXX'],
  ]) {
    await Setting.updateOne({ key }, { $setOnInsert: { key, value } }, { upsert: true });
  }

  console.log(`Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products, 2 offers.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
