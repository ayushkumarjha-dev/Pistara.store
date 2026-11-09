import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Leaf,
  PackageCheck,
  Quote,
  QrCode,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { getCategories, getProducts, getTestimonials } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { LeafDivider, Reveal, SectionTitle, Stars, WhatsAppIcon } from "@/components/shop/brand";
import hero from "@/assets/hero.jpg";
import cashew from "@/assets/cashew.jpg";
import makhana from "@/assets/makhana.jpg";
import raisins from "@/assets/raisins.jpg";
import sourcing from "@/assets/sourcing.jpg";

const featuredQ = queryOptions({
  queryKey: ["products", "featured"],
  queryFn: () => getProducts({ featured: true }),
});
const allQ = queryOptions({
  queryKey: ["products", "all"],
  queryFn: () => getProducts({ limit: 50 }),
});
const catsQ = queryOptions({ queryKey: ["categories"], queryFn: getCategories });
const testQ = queryOptions({ queryKey: ["testimonials"], queryFn: getTestimonials });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pistara | Premium Dry Fruits, Pure & Natural" },
      {
        name: "description",
        content:
          "Hand-selected makhana, W320 cashews and raisins. Hygienically packed, delivered fast across India.",
      },
      { property: "og:title", content: "Pistara | Premium Dry Fruits, Pure & Natural" },
      {
        property: "og:description",
        content: "Hand-selected makhana, cashews and raisins, delivered fresh across India.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(featuredQ),
      context.queryClient.ensureQueryData(allQ),
      context.queryClient.ensureQueryData(catsQ),
      context.queryClient.ensureQueryData(testQ),
    ]).catch(() => []),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Categories />
      <Featured />
      <WhyPistara />
      <PackBanner />
      <Testimonials />
      <Steps />
      <Newsletter />
    </>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <section className="grain relative overflow-hidden">
      <div className="container-page grid items-center gap-14 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow flex items-center gap-2">
            <Leaf className="size-3.5" /> {t("heroEyebrow")}
          </p>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] text-primary-deep sm:text-6xl lg:text-[4.5rem]">
            {t("heroA")}
            <br />
            <span className="accent-serif font-semibold text-primary">{t("heroB")}</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("heroSub")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/shop">
                {t("shopNow")} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/about">{t("ourStory")}</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-gold text-gold" /> <b className="text-foreground">4.9</b>{" "}
              rating
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1.5">
              <Leaf className="size-4 text-primary" /> {t("natural")}
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1.5">
              <Truck className="size-4 text-primary" /> {t("fast")}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[540px]"
        >
          <svg
            viewBox="0 0 600 600"
            className="absolute -inset-10 -z-10 size-[calc(100%+5rem)] text-sage"
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M455 92c58 46 103 121 98 196-5 76-60 152-128 205-68 52-149 82-226 63-77-20-150-90-170-172-20-83 13-178 74-238C164 86 254 61 323 57c68-4 74-11 132 35Z"
            />
          </svg>
          <div className="overflow-hidden rounded-[2.5rem] shadow-lift">
            <img
              src={hero}
              alt="Cashews, raisins, makhana and almonds in a ceramic bowl"
              width={1200}
              height={1408}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          {[
            { img: cashew, cls: "-left-6 top-14 md:-left-12", d: 0 },
            { img: makhana, cls: "-right-4 top-1/3 md:-right-10", d: 1.5 },
            { img: raisins, cls: "-left-2 bottom-20 md:-left-8", d: 3 },
          ].map((f) => (
            <div
              key={f.img}
              className={`animate-float absolute ${f.cls}`}
              style={{ animationDelay: `${f.d}s` }}
            >
              <img
                src={f.img}
                alt=""
                className="size-20 rounded-full border-4 border-card object-cover shadow-lift md:size-24"
              />
            </div>
          ))}
          <div className="absolute -bottom-5 right-8 flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-display text-sm font-bold text-gold-foreground shadow-gold">
            <Sparkles className="size-4" /> Fresh Stock
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { t } = useI18n();
  const items = [
    { icon: Leaf, label: t("natural"), sub: "No additives, ever" },
    { icon: Sparkles, label: t("premiumQ"), sub: "Top-grade, hand-sorted" },
    { icon: ShieldCheck, label: t("hygienic"), sub: "Sealed, FSSAI certified" },
    { icon: Truck, label: t("fast"), sub: "Pan-India in 2–5 days" },
  ];
  return (
    <section className="border-y bg-card">
      <div className="container-page grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal
            key={it.label}
            delay={i * 0.08}
            className="flex items-center gap-4 border-border px-2 py-5 sm:py-7 lg:justify-center lg:border-l lg:first:border-l-0"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sage text-primary">
              <it.icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-primary-deep">{it.label}</p>
              <p className="text-xs text-muted-foreground">{it.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  const { t, lang } = useI18n();
  const { data: cats } = useQuery({ ...catsQ, retry: 1 });
  const { data: all } = useQuery({ ...allQ, retry: 1 });
  if (!cats || !all) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionTitle eyebrow="Collections" a={t("shopByCat")} b={t("category")} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cats.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.1}>
              <Link
                to="/shop"
                search={{ category: c.slug }}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-soft"
              >
                <img
                  src={c.imageUrl ?? ""}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="bg-overlay absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-7 text-primary-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gold">
                      {all.products.filter((p) => p.category === c.slug).length} {t("items")}
                    </p>
                    <h3 className="mt-2 text-3xl font-bold">{lang === "hi" ? c.nameHi : c.name}</h3>
                  </div>
                  <span className="grid size-12 place-items-center rounded-full bg-cream text-primary-deep transition-all duration-300 group-hover:rotate-45 group-hover:bg-gold">
                    <ArrowUpRight className="size-5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const { t } = useI18n();
  const { data } = useQuery({ ...featuredQ, retry: 1 });
  const featured = data?.products ?? [];
  if (!data) return null;
  return (
    <section className="grain section-y bg-olive-50">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow="Bestsellers" a={t("featured")} b={t("picks")} align="left" />
          <Button variant="outline" asChild>
            <Link to="/shop">
              {t("viewAll")} <ArrowRight />
            </Link>
          </Button>
        </div>
        <motion.div
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {featured.map((p) => (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function WhyPistara() {
  const { t } = useI18n();
  const points = [
    {
      title: "Direct from the farm",
      text: "We buy straight from growers in Mithila, Konkan and Nashik, with no middlemen and no old stock.",
    },
    {
      title: "Graded by hand",
      text: "Every batch is sorted by size and colour. Broken pieces never make it into a Pistara pack.",
    },
    {
      title: "Packed fresh, sealed tight",
      text: "Nitrogen-flushed, resealable pouches lock in crunch and natural oils for months.",
    },
    {
      title: "Honest, transparent pricing",
      text: "Clear per-pack prices with a flat ₹50 delivery. What you see is what you pay.",
    },
  ];
  return (
    <section className="section-y bg-sage">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <Reveal className="relative">
          <img
            src={sourcing}
            alt="Artisans hand-sorting cashews and raisins"
            loading="lazy"
            className="aspect-[5/6] w-full rounded-[2rem] object-cover shadow-lift"
          />
          <div className="absolute -bottom-6 -right-2 rounded-2xl border bg-card p-5 shadow-lift md:-right-8">
            <p className="font-display text-3xl font-extrabold text-primary">12+</p>
            <p className="text-xs text-muted-foreground">partner farms across India</p>
          </div>
        </Reveal>
        <div>
          <SectionTitle eyebrow="Our promise" a={t("why")} b="Pistara" align="left" />
          <ol className="mt-10 space-y-7">
            {points.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08} className="flex gap-5">
                <span className="font-serif text-3xl italic text-gold">0{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold text-primary-deep">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PackBanner() {
  const { t } = useI18n();
  return (
    <section className="grain bg-olive-gradient py-20 text-primary-foreground">
      <Reveal className="container-page flex flex-col items-center gap-8 text-center">
        <p className="eyebrow">Flexible sizes</p>
        <h2 className="text-3xl font-bold md:text-5xl">
          {t("packTitle")}: <span className="accent-serif text-gold">250g • 500g • 1kg</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {["250g · Try it", "500g · Family", "1kg · Best value"].map((s) => (
            <span key={s} className="rounded-full border border-gold/50 px-5 py-2 text-sm">
              {s}
            </span>
          ))}
        </div>
        <Button variant="gold" size="lg" asChild>
          <Link to="/shop">
            {t("packCta")} <ArrowRight />
          </Link>
        </Button>
      </Reveal>
    </section>
  );
}

function Testimonials() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(testQ);
  const [i, setI] = useState(0);
  const go = (d: number) => setI((x) => (x + d + data.length) % data.length);
  const visible = [0, 1, 2].map((k) => data[(i + k) % data.length]!).filter(Boolean);
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionTitle eyebrow="Testimonials" a={t("testimonials")} b={t("india")} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((r, k) => (
              <motion.figure
                key={r.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45 }}
                className={`flex flex-col rounded-3xl border bg-card p-8 shadow-soft ${k > 0 ? "hidden md:flex" : ""}`}
              >
                <Quote className="size-9 fill-gold/20 text-gold" />
                <blockquote className="mt-5 flex-1 leading-relaxed text-foreground/85">
                  “{r.quote}”
                </blockquote>
                <div className="mt-6 h-px bg-gold/30" />
                <figcaption className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold text-primary-deep">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.city}</p>
                  </div>
                  <Stars value={r.rating} />
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
          >
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next testimonial">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const { t } = useI18n();
  const steps = [
    { icon: ShoppingBasket, label: t("step1"), text: "Pick your favourites and pack sizes." },
    { icon: WhatsAppIcon, label: t("step2"), text: "Your order is pre-filled in a WhatsApp chat." },
    { icon: QrCode, label: t("step3"), text: "Scan our QR, pay and follow every step." },
  ];
  return (
    <section className="grain section-y bg-olive-50">
      <div className="container-page">
        <SectionTitle eyebrow="How it works" a={t("stepsTitle")} b={t("stepsB")} />
        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <div
            className="absolute left-[16%] right-[16%] top-10 hidden h-px border-t-2 border-dashed border-gold/50 md:block"
            aria-hidden
          />
          {steps.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.12} className="relative text-center">
              <div className="relative mx-auto grid size-20 place-items-center rounded-full border bg-card text-primary shadow-soft">
                <s.icon className="size-8" />
                <span className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-gold font-display text-xs font-bold text-gold-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-primary-deep">{s.label}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-14 flex justify-center">
          <Button size="lg" asChild>
            <Link to="/shop">
              <PackageCheck /> {t("shopNow")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  return (
    <section className="section-y">
      <div className="container-page">
        <Reveal className="grain relative overflow-hidden rounded-[2.5rem] bg-primary-deep px-6 py-16 text-center text-primary-foreground md:px-16">
          <p className="eyebrow">Newsletter</p>
          <h2 className="mt-3 text-3xl font-bold md:text-5xl">
            {t("newsletter")} <span className="accent-serif text-gold">{t("newsletterB")}</span>
          </h2>
          <LeafDivider className="mt-5" light />
          <p className="mx-auto mt-5 max-w-md text-sm text-primary-foreground/70">
            Seasonal harvest drops, recipes and members-only offers. No spam, ever.
          </p>
          <form
            noValidate
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email))
                return setErr("Please enter a valid email address.");
              setErr("");
              setEmail("");
              toast.success("You're in!", { description: "Welcome to the Pistara circle." });
            }}
          >
            <label htmlFor="nl-email" className="sr-only">
              Email
            </label>
            <input
              id="nl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!err}
              className="h-12 flex-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-5 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/50 focus:border-gold"
            />
            <Button variant="gold" size="lg" type="submit">
              {t("subscribe")}
            </Button>
          </form>
          {err && <p className="mt-3 text-sm text-gold">{err}</p>}
        </Reveal>
      </div>
    </section>
  );
}
