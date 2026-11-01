import makhana from "@/assets/makhana.jpg";
import makhanaRoasted from "@/assets/makhana-roasted.jpg";
import cashew from "@/assets/cashew.jpg";
import cashewRoasted from "@/assets/cashew-roasted.jpg";
import raisins from "@/assets/raisins.jpg";
import raisinsMix from "@/assets/raisins-mix.jpg";
import hero from "@/assets/hero.jpg";

export type CategorySlug = "makhana" | "cashew" | "dried-grapes";

export interface Category {
  slug: CategorySlug;
  name: string;
  nameHi: string;
  tagline: string;
  image: string;
}

export interface Variant {
  id: string;
  label: "250g" | "500g" | "1kg";
  price: number;
  mrp: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameHi: string;
  category: CategorySlug;
  description: string;
  images: string[];
  variants: Variant[];
  rating: number;
  reviews: number;
  badge?: "Premium" | "Bestseller" | "New";
  featured: boolean;
  active: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  city: string;
  rating: number;
  quote: string;
}

export const categories: Category[] = [
  { slug: "makhana", name: "Makhana", nameHi: "मखाना", tagline: "Light, crunchy, wholesome", image: makhana },
  { slug: "cashew", name: "Cashew", nameHi: "काजू", tagline: "Creamy, buttery, whole", image: cashew },
  { slug: "dried-grapes", name: "Dried Grapes", nameHi: "किशमिश", tagline: "Sun-dried natural sweetness", image: raisins },
];

const v = (id: string, prices: [number, number, number], mrps: [number, number, number], stock: [number, number, number] = [40, 30, 18]): Variant[] => [
  { id: `${id}-250`, label: "250g", price: prices[0], mrp: mrps[0], stock: stock[0] },
  { id: `${id}-500`, label: "500g", price: prices[1], mrp: mrps[1], stock: stock[1] },
  { id: `${id}-1kg`, label: "1kg", price: prices[2], mrp: mrps[2], stock: stock[2] },
];

export const products: Product[] = [
  {
    id: "p1", slug: "premium-makhana", name: "Premium Makhana", nameHi: "प्रीमियम मखाना", category: "makhana",
    description: "Hand-picked 6-suta jumbo fox nuts from the wetlands of Mithila, Bihar. Light, airy and naturally gluten-free.",
    images: [makhana, makhanaRoasted], variants: v("p1", [280, 540, 1040], [350, 680, 1300]),
    rating: 4.9, reviews: 412, badge: "Bestseller", featured: true, active: true,
  },
  {
    id: "p2", slug: "roasted-makhana", name: "Roasted Masala Makhana", nameHi: "भुना मसाला मखाना", category: "makhana",
    description: "Slow-roasted in cold-pressed oil with a house blend of peri-peri, curry leaf and rock salt.",
    images: [makhanaRoasted, makhana], variants: v("p2", [240, 460, 880], [299, 560, 1080], [25, 12, 4]),
    rating: 4.7, reviews: 238, badge: "New", featured: true, active: true,
  },
  {
    id: "p3", slug: "cashew-w320", name: "Cashew W320", nameHi: "काजू W320", category: "cashew",
    description: "Whole, ivory-white W320 grade cashews from Goa and Konkan. Creamy, buttery and crunch-perfect.",
    images: [cashew, hero], variants: v("p3", [399, 780, 1499], [499, 960, 1850]),
    rating: 4.9, reviews: 586, badge: "Premium", featured: true, active: true,
  },
  {
    id: "p4", slug: "cashew-roasted-salted", name: "Cashew Roasted & Salted", nameHi: "भुने नमकीन काजू", category: "cashew",
    description: "Whole cashews roasted to a golden finish and kissed with Himalayan pink salt.",
    images: [cashewRoasted, cashew], variants: v("p4", [429, 830, 1599], [520, 1000, 1950]),
    rating: 4.8, reviews: 301, badge: "Bestseller", featured: true, active: true,
  },
  {
    id: "p5", slug: "kishmish-green-raisins", name: "Kishmish Green Raisins", nameHi: "हरी किशमिश", category: "dried-grapes",
    description: "Long, plump Afghani-style green raisins shade-dried in Nashik. Naturally sweet and tangy.",
    images: [raisins, raisinsMix], variants: v("p5", [199, 380, 720], [260, 490, 930]),
    rating: 4.8, reviews: 274, badge: "Premium", featured: true, active: true,
  },
  {
    id: "p6", slug: "black-raisins", name: "Black Raisins", nameHi: "काली किशमिश", category: "dried-grapes",
    description: "Seeded black raisins rich in iron and antioxidants, ideal soaked overnight.",
    images: [raisinsMix, raisins], variants: v("p6", [220, 420, 799], [280, 540, 1020]),
    rating: 4.7, reviews: 156, featured: true, active: true,
  },
  {
    id: "p7", slug: "seedless-golden-raisins", name: "Seedless Golden Raisins", nameHi: "सुनहरी किशमिश", category: "dried-grapes",
    description: "Golden, seedless and juicy. A bright addition to kheer, pulao and morning oats.",
    images: [raisinsMix, hero], variants: v("p7", [210, 400, 760], [270, 510, 980]),
    rating: 4.6, reviews: 128, featured: false, active: true,
  },
  {
    id: "p8", slug: "classic-makhana-jumbo", name: "Classic Jumbo Makhana", nameHi: "जंबो मखाना", category: "makhana",
    description: "Extra-large 5-suta grade fox nuts, popped fresh in small batches.",
    images: [makhana, hero], variants: v("p8", [260, 499, 960], [320, 620, 1200]),
    rating: 4.8, reviews: 190, featured: false, active: true,
  },
];

export const testimonials: Testimonial[] = [
  { id: "t1", name: "Ananya Sharma", city: "Delhi", rating: 5, quote: "The cashews are unbelievably fresh: whole, creamy, not a single broken piece. Pistara is now our family's only dry fruit brand." },
  { id: "t2", name: "Rohit Mehta", city: "Mumbai", rating: 5, quote: "Ordering on WhatsApp was effortless and the packaging felt like a gift. The masala makhana disappears in a day." },
  { id: "t3", name: "Priya Iyer", city: "Bengaluru", rating: 5, quote: "Green kishmish this plump is rare. You can taste the quality, and delivery to my door took two days." },
  { id: "t4", name: "Karan Singh", city: "Jaipur", rating: 4, quote: "Premium in every sense. I gifted the 1kg cashew pack for Diwali and everyone asked where it was from." },
];
