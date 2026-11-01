<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All catalog/order data access goes through async functions in src/lib/api.ts backed by src/data; keeps the mock swappable for a real backend.
- Cart, language and (later) mock auth/orders persist in localStorage, read only inside useEffect to avoid hydration mismatches.
- Storefront chrome (header, footer, cart drawer, WhatsApp button) lives in src/components/shop/SiteLayout, mounted from __root.
