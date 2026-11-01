import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api";

const FALLBACK_WHATSAPP = "919876543210";

export function useSettings() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings, staleTime: 5 * 60_000, retry: 1 });
  return {
    settings: data ?? {},
    whatsapp: data?.["whatsapp_number"] || FALLBACK_WHATSAPP,
    deliveryCharge: Number(data?.["delivery_charge"] ?? 50),
  };
}
