import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

const dict = {
  en: {
    announce: "Free tasting notes with every order • Premium quality, hygienically packed",
    home: "Home", shop: "Shop", about: "About", contact: "Contact",
    login: "Login", profile: "Profile", orders: "My Orders", logout: "Logout",
    search: "Search dry fruits…", cart: "Your Cart", emptyCart: "Your cart is empty",
    startShopping: "Start shopping", subtotal: "Subtotal", delivery: "Delivery", total: "Total",
    checkoutWa: "Checkout on WhatsApp", viewCart: "View full cart",
    quickAdd: "Quick Add", from: "From", added: "Added to cart",
    shopNow: "Shop Now", ourStory: "Our Story",
    heroEyebrow: "Nature's finest • Hand-selected",
    heroA: "Premium Dry Fruits,", heroB: "Pure & Natural",
    heroSub: "Jumbo makhana from Mithila, whole W320 cashews from Konkan and sun-kissed raisins from Nashik. Sourced directly, packed fresh.",
    natural: "100% Natural", premiumQ: "Premium Quality", hygienic: "Hygienically Packed", fast: "Fast Delivery",
    shopByCat: "Shop by", category: "Category", items: "products",
    featured: "Featured", picks: "Picks", viewAll: "View all",
    why: "Why", testimonials: "Loved across", india: "India",
    stepsTitle: "Order in", stepsB: "3 simple steps",
    step1: "Choose products", step2: "Checkout on WhatsApp", step3: "Pay via QR & track",
    packTitle: "Choose your pack", packCta: "Explore packs",
    newsletter: "Join the", newsletterB: "Pistara circle", subscribe: "Subscribe",
  },
  hi: {
    announce: "हर ऑर्डर के साथ मुफ़्त टेस्टिंग नोट्स • प्रीमियम गुणवत्ता, स्वच्छ पैकिंग",
    home: "होम", shop: "शॉप", about: "हमारे बारे में", contact: "संपर्क",
    login: "लॉगिन", profile: "प्रोफ़ाइल", orders: "मेरे ऑर्डर", logout: "लॉगआउट",
    search: "ड्राई फ्रूट्स खोजें…", cart: "आपकी कार्ट", emptyCart: "आपकी कार्ट खाली है",
    startShopping: "खरीदारी शुरू करें", subtotal: "उप-योग", delivery: "डिलीवरी", total: "कुल",
    checkoutWa: "WhatsApp पर चेकआउट", viewCart: "पूरी कार्ट देखें",
    quickAdd: "जल्दी जोड़ें", from: "शुरुआत", added: "कार्ट में जोड़ा गया",
    shopNow: "अभी खरीदें", ourStory: "हमारी कहानी",
    heroEyebrow: "प्रकृति का सर्वश्रेष्ठ • हाथ से चुना",
    heroA: "प्रीमियम ड्राई फ्रूट्स,", heroB: "शुद्ध और प्राकृतिक",
    heroSub: "मिथिला का जंबो मखाना, कोंकण के साबुत W320 काजू और नासिक की धूप में सूखी किशमिश। सीधे स्रोत से, ताज़ा पैक।",
    natural: "100% प्राकृतिक", premiumQ: "प्रीमियम गुणवत्ता", hygienic: "स्वच्छ पैकिंग", fast: "तेज़ डिलीवरी",
    shopByCat: "श्रेणी के", category: "अनुसार", items: "उत्पाद",
    featured: "चुनिंदा", picks: "उत्पाद", viewAll: "सभी देखें",
    why: "क्यों", testimonials: "पूरे भारत में", india: "पसंदीदा",
    stepsTitle: "ऑर्डर करें", stepsB: "3 आसान चरणों में",
    step1: "उत्पाद चुनें", step2: "WhatsApp पर चेकआउट", step3: "QR से भुगतान और ट्रैक",
    packTitle: "अपना पैक चुनें", packCta: "पैक देखें",
    newsletter: "जुड़ें", newsletterB: "पिस्तारा परिवार से", subscribe: "सब्सक्राइब",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string }>({
  lang: "en", setLang: () => {}, t: (k) => dict.en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("pistara-lang");
    if (s === "hi" || s === "en") setLangState(s);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("pistara-lang", l);
  };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
