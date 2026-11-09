import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiPut } from "@/lib/api-client";
import { getSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Settings | Pistara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminSettings,
});

const FIELDS: { key: string; label: string; hint?: string; numeric?: boolean }[] = [
  {
    key: "whatsapp_number",
    label: "WhatsApp number",
    hint: "Country code + number, digits only (e.g. 919876543210)",
  },
  { key: "delivery_charge", label: "Delivery charge (₹)", numeric: true },
  { key: "store_name", label: "Store name" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_phone", label: "Contact phone (display)" },
  { key: "store_address", label: "Store address (display)" },
  { key: "hero_headline", label: "Hero headline" },
  { key: "hero_subtitle", label: "Hero subtitle" },
  { key: "announcement_text", label: "Announcement bar text" },
];

function AdminSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: getSettings, retry: 1 });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiPut("/api/admin/settings", {
        whatsapp_number: form["whatsapp_number"] ?? "",
        delivery_charge: Number(form["delivery_charge"] ?? 50),
        store_name: form["store_name"] ?? "",
        contact_email: form["contact_email"] ?? "",
        contact_phone: form["contact_phone"] ?? "",
        store_address: form["store_address"] ?? "",
        hero_headline: form["hero_headline"] ?? "",
        hero_subtitle: form["hero_subtitle"] ?? "",
        announcement_text: form["announcement_text"] ?? "",
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed"),
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl border bg-card" />;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-primary-deep">Settings</h2>
      <form
        className="mt-6 max-w-xl space-y-5 rounded-2xl border bg-card p-6 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`s-${f.key}`} className="text-sm font-medium">
              {f.label}
            </label>
            <input
              id={`s-${f.key}`}
              type={f.numeric ? "number" : "text"}
              min={f.numeric ? 0 : undefined}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:border-primary"
            />
            {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </form>
    </div>
  );
}
