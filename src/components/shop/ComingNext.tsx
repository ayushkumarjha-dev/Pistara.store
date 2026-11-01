import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LeafDivider } from "./brand";

export function ComingNext({ title, accent, text }: { title: string; accent: string; text: string }) {
  return (
    <section className="grain section-y">
      <div className="container-page max-w-2xl text-center">
        <p className="eyebrow">Pistara</p>
        <h1 className="mt-3 text-4xl font-bold text-primary-deep md:text-6xl">
          {title} <span className="accent-serif text-primary">{accent}</span>
        </h1>
        <LeafDivider className="mt-6" />
        <p className="mt-6 text-muted-foreground">{text}</p>
        <Button asChild className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </section>
  );
}
