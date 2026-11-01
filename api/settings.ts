import { getDb } from "../db/client";
import { settings } from "../db/schema";
import { handler } from "../server-lib/http";

const PUBLIC_KEYS = [
  "whatsapp_number",
  "delivery_charge",
  "store_name",
  "contact_email",
  "contact_phone",
  "store_address",
  "hero_headline",
  "hero_subtitle",
  "announcement_text",
];

export default handler({
  methods: ["GET"],
  handler: async () => {
    const db = getDb();
    const rows = await db.select().from(settings);
    const out: Record<string, string> = {};
    for (const r of rows) if (PUBLIC_KEYS.includes(r.key)) out[r.key] = r.value;
    return { settings: out };
  },
});
