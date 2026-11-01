import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Pistara" },
      { name: "description", content: "Reach Pistara on WhatsApp, phone or email." },
      { property: "og:title", content: "Contact | Pistara" },
      { property: "og:description", content: "Reach Pistara on WhatsApp, phone or email." },
    ],
  }),
  component: () => <ComingNext title="Get in" accent="Touch" text="The contact page arrives in the next step. Meanwhile, tap the WhatsApp button." />,
});
