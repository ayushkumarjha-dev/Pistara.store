// Seed catalogue — mirrors src/data/catalog.ts, with image URLs served from /public/images.
// Kept asset-import-free so Node scripts (seed/reset) can load it directly.

export interface SeedVariant {
  label: "250g" | "500g" | "1kg";
  weightGrams: number;
  price: number;
  mrp: number;
  stock: number;
}

export interface SeedProduct {
  slug: string;
  name: string;
  nameHi: string;
  category: "makhana" | "cashew" | "dried-grapes";
  description: string;
  images: string[];
  variants: [SeedVariant, SeedVariant, SeedVariant];
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
}

export const seedCategories = [
  {
    slug: "makhana",
    name: "Makhana",
    nameHi: "मखाना",
    imageUrl: "/images/makhana.jpg",
    sortOrder: 0,
  },
  { slug: "cashew", name: "Cashew", nameHi: "काजू", imageUrl: "/images/cashew.jpg", sortOrder: 1 },
  {
    slug: "dried-grapes",
    name: "Dried Grapes",
    nameHi: "किशमिश",
    imageUrl: "/images/raisins.jpg",
    sortOrder: 2,
  },
] as const;

const v = (
  prices: [number, number, number],
  mrps: [number, number, number],
  stock: [number, number, number] = [40, 30, 18],
): [SeedVariant, SeedVariant, SeedVariant] => [
  { label: "250g", weightGrams: 250, price: prices[0], mrp: mrps[0], stock: stock[0] },
  { label: "500g", weightGrams: 500, price: prices[1], mrp: mrps[1], stock: stock[1] },
  { label: "1kg", weightGrams: 1000, price: prices[2], mrp: mrps[2], stock: stock[2] },
];

export const seedProducts: SeedProduct[] = [
  {
    slug: "premium-makhana",
    name: "Premium Makhana",
    nameHi: "प्रीमियम मखाना",
    category: "makhana",
    description:
      "Hand-picked 6-suta jumbo fox nuts from the wetlands of Mithila, Bihar. Light, airy and naturally gluten-free.",
    images: ["/images/makhana.jpg", "/images/makhana-roasted.jpg"],
    variants: v([280, 540, 1040], [350, 680, 1300]),
    rating: 4.9,
    reviewCount: 412,
    isFeatured: true,
  },
  {
    slug: "roasted-makhana",
    name: "Roasted Masala Makhana",
    nameHi: "भुना मसाला मखाना",
    category: "makhana",
    description:
      "Slow-roasted in cold-pressed oil with a house blend of peri-peri, curry leaf and rock salt.",
    images: ["/images/makhana-roasted.jpg", "/images/makhana.jpg"],
    variants: v([240, 460, 880], [299, 560, 1080], [25, 12, 4]),
    rating: 4.7,
    reviewCount: 238,
    isFeatured: true,
  },
  {
    slug: "cashew-w320",
    name: "Cashew W320",
    nameHi: "काजू W320",
    category: "cashew",
    description:
      "Whole, ivory-white W320 grade cashews from Goa and Konkan. Creamy, buttery and crunch-perfect.",
    images: ["/images/cashew.jpg", "/images/hero.jpg"],
    variants: v([399, 780, 1499], [499, 960, 1850]),
    rating: 4.9,
    reviewCount: 586,
    isFeatured: true,
  },
  {
    slug: "cashew-roasted-salted",
    name: "Cashew Roasted & Salted",
    nameHi: "भुने नमकीन काजू",
    category: "cashew",
    description: "Whole cashews roasted to a golden finish and kissed with Himalayan pink salt.",
    images: ["/images/cashew-roasted.jpg", "/images/cashew.jpg"],
    variants: v([429, 830, 1599], [520, 1000, 1950]),
    rating: 4.8,
    reviewCount: 301,
    isFeatured: true,
  },
  {
    slug: "kishmish-green-raisins",
    name: "Kishmish Green Raisins",
    nameHi: "हरी किशमिश",
    category: "dried-grapes",
    description:
      "Long, plump Afghani-style green raisins shade-dried in Nashik. Naturally sweet and tangy.",
    images: ["/images/raisins.jpg", "/images/raisins-mix.jpg"],
    variants: v([199, 380, 720], [260, 490, 930]),
    rating: 4.8,
    reviewCount: 274,
    isFeatured: true,
  },
  {
    slug: "black-raisins",
    name: "Black Raisins",
    nameHi: "काली किशमिश",
    category: "dried-grapes",
    description: "Seeded black raisins rich in iron and antioxidants, ideal soaked overnight.",
    images: ["/images/raisins-mix.jpg", "/images/raisins.jpg"],
    variants: v([220, 420, 799], [280, 540, 1020]),
    rating: 4.7,
    reviewCount: 156,
    isFeatured: true,
  },
  {
    slug: "seedless-golden-raisins",
    name: "Seedless Golden Raisins",
    nameHi: "सुनहरी किशमिश",
    category: "dried-grapes",
    description: "Golden, seedless and juicy. A bright addition to kheer, pulao and morning oats.",
    images: ["/images/raisins-mix.jpg", "/images/hero.jpg"],
    variants: v([210, 400, 760], [270, 510, 980]),
    rating: 4.6,
    reviewCount: 128,
    isFeatured: false,
  },
  {
    slug: "classic-makhana-jumbo",
    name: "Classic Jumbo Makhana",
    nameHi: "जंबो मखाना",
    category: "makhana",
    description: "Extra-large 5-suta grade fox nuts, popped fresh in small batches.",
    images: ["/images/makhana.jpg", "/images/hero.jpg"],
    variants: v([260, 499, 960], [320, 620, 1200]),
    rating: 4.8,
    reviewCount: 190,
    isFeatured: false,
  },
];

export const seedSettings: Record<string, string> = {
  whatsapp_number: "919876543210",
  delivery_charge: "50",
  store_name: "Pistara",
  contact_email: "hello@pistara.in",
  contact_phone: "+91 98765 43210",
  store_address: "Pistara Foods, Patna, Bihar",
  hero_headline: "Premium dry fruits, delivered fresh",
  hero_subtitle: "Hand-picked makhana, cashews and kishmish from trusted farms.",
  announcement_text: "Free delivery on orders above ₹999 · Flat ₹50 delivery",
};
