import { Link } from "@tanstack/react-router";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Leaf, Star } from "lucide-react";
import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="Pistara home">
      <span className={cn("grid size-10 place-items-center rounded-full", light ? "bg-cream" : "bg-olive-50")}>
        <img src={logoMark} alt="" width={64} height={64} className="size-8 object-contain" />
      </span>
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-[0.18em]",
          light ? "text-primary-foreground" : "text-primary-deep",
        )}
      >
        PISTARA
      </span>
    </Link>
  );
}

export function LeafDivider({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)} aria-hidden>
      <span className={cn("h-px w-12", light ? "bg-gold/60" : "bg-gold/70")} />
      <Leaf className="size-4 text-gold" />
      <span className={cn("h-px w-12", light ? "bg-gold/60" : "bg-gold/70")} />
    </div>
  );
}

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size === "sm" ? "size-3.5" : "size-4.5", i <= Math.round(value) ? "fill-gold text-gold" : "text-border")}
        />
      ))}
    </span>
  );
}

export function Reveal({ delay = 0, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    />
  );
}

export function SectionTitle({
  eyebrow, a, b, align = "center", light = false,
}: { eyebrow: string; a: string; b: string; align?: "center" | "left"; light?: boolean }) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={cn("mt-3 text-3xl font-bold md:text-5xl", light ? "text-primary-foreground" : "text-primary-deep")}>
        {a} <span className={cn("accent-serif", light ? "text-gold" : "text-primary")}>{b}</span>
      </h2>
      <LeafDivider className={cn("mt-5", align === "left" && "justify-start")} light={light} />
    </Reveal>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36A9.4 9.4 0 0 1 2.6 12a9.44 9.44 0 0 1 16.12-6.68A9.4 9.4 0 0 1 21.5 12a9.45 9.45 0 0 1-9.45 9.5M20.1 3.9A11.3 11.3 0 0 0 12.05.5 11.4 11.4 0 0 0 2.17 17.6L.55 23.5l6.04-1.58a11.4 11.4 0 0 0 5.45 1.39h.01A11.4 11.4 0 0 0 23.5 12a11.3 11.3 0 0 0-3.4-8.1" />
    </svg>
  );
}
