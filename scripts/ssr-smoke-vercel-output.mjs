// TEMP harness: drive the compiled nitro/vercel SSR function exactly like the
// Vercel runtime would: NODE_ENV=production + Web-Fetch handler.
const mod = await import(
  new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url).href
);

const paths =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["/", "/shop", "/about", "/favicon.ico"];
let failures = 0;
for (const path of paths) {
  const res = await mod.default.fetch(new Request("http://localhost:4173" + path));
  const body = await res.text();
  const hasHtml = body.includes("<html");
  const titleMatch = body.match(/<title>[^<]*<\/title>/);
  console.log(
    `[${res.status}] ${path} len=${body.length} hasHtml=${hasHtml} title=${titleMatch ? titleMatch[0] : "(none)"}`,
  );
  if (res.status >= 500) {
    failures++;
    console.log("  body head:", body.slice(0, 300).replace(/\n/g, " "));
  }
}
process.exit(failures > 0 ? 1 : 0);
