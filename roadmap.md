# PISTARA Backend Roadmap (Vercel + Turso per uploaded brief)

- [x] Phase 1: DB schema (Drizzle/libSQL), migrations, seed, test-DB helpers, config files
- [x] Phase 2: Auth APIs (register/login/logout/me/change-password) + unit/API tests (43 passing)
- [x] Phase 3: Products, categories, settings, profile APIs + tests (frontend wiring in Phase 6)
- [x] Phase 4: Orders (create/list/detail/cancel, stock rules) + tests (checkout wiring in Phase 6)
- [x] Phase 5: Admin APIs (stats/products/orders/customers/settings) + tests (admin UI in Phase 6) — 94 tests green
- [ ] Phase 6: Missing frontend pages (shop, product, cart, login, profile, orders, admin) + Playwright E2E
- [ ] Phase 7: CI workflow (GitHub Actions + gated Vercel deploy), hardening, README
- [ ] Blocked on user: Turso credentials (prod + test DB URLs/tokens), Vercel org/project IDs, GitHub secrets
