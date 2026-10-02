---
name: pages
description: Rules for changing screens under app/**/page.tsx in the banking UI portal (customer and staff portals, server vs client pages, public pages, loading and error states). Use when adding or editing a page.
---

# Pages (`app/**/page.tsx`)

**Job:** one screen per route. Fetch or receive data, lay it out, hand actions to `lib/api.ts`.

Rules:
- Server component by default. Add `"use client"` only when the page needs state, effects, browser APIs or event
  handlers (forms, anything calling `useAuth`).
- Content pages (`/terms`, `/privacy`, `/help`) stay server components fed by `lib/legal.ts` / `lib/faq.ts`.
- Two portals: customer pages at `/`, `/accounts/*`, `/settings/*`; staff pages under `/staff/*`. A screen both portals have
  is one shared component taking `kind`, and each `page.tsx` is a one-line wrapper. Do not copy it.
- Public pages must be listed in `PUBLIC_PAGES` in `proxy.ts`, or signed-out visitors are redirected to a sign-in page.
- Hide what a staff role cannot do with `can(user, privilege)`, but never rely on it: the backend enforces privileges.
- Every page must be responsive (a 320px phone up to a wide desktop; see portal-conventions). Add new routes to `e2e/mobile.spec.ts`.
- Show loading and errors with `StateBlock` (`Loading`, `ErrorMessage`), not ad-hoc markup.
- A new page needs a nav or settings link and a row in the matching README screen table.
- Dynamic segments use `[accountNumber]` / `[employeeNumber]`; read them with `useParams` (client) or `params` (server).
