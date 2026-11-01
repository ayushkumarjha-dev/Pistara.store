export function formatOrderNumber(year: number, n: number): string {
  return `PST-${year}-${String(n).padStart(4, "0")}`;
}
