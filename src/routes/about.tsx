import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story | Pistara" },
      { name: "description", content: "How Pistara sources and packs India's finest dry fruits." },
      { property: "og:title", content: "Our Story | Pistara" },
      { property: "og:description", content: "How Pistara sources and packs India's finest dry fruits." },
    ],
  }),
  component: () => <ComingNext title="Our" accent="Story" text="Our brand story, values and sourcing page arrive in the next step." />,
});
