---
name: components
description: Rules for shared React components in components/ plus per-component rules (NavBar, AuthProvider, HolderFields, TransactionForm, CookieNotice and others). Use when adding or editing a component.
---

# Components (`components/`)

**Job:** reusable UI shared by pages or the root layout.

Rules:
- Default export, one component per file, props typed inline or with a local interface.
- Mark `"use client"` only if it uses state, effects, or browser APIs. Leave presentational ones as server components.
- No `node:` imports and no direct file or backend access; get data through props, `useAuth`, or `lib/api.ts`.
- Use the existing CSS classes (`card`, `badge`, `muted`, `error`, `row`, `stack`, `subsection`, `req`, `actions`).
  Add new styles to `app/globals.css` with theme variables, so light and dark both work.
- Interactive elements need labels; use native elements (`<details>`, `<dialog>`, `<label>`) before custom ones.
- Touch targets are at least 44px at phone width (see the media query in `globals.css`).

### Per-component rules

| Component | Rules |
|---|---|
| `AuthProvider.tsx` | Single source of the signed-in user (`useAuth`). Auth transitions (login, logout, expiry) end in `hardNavigate` from `lib/navigation.ts`, never `router.replace`. Sets the customer ID for `lib/api.ts`. Wrap it once, in `layout.tsx`. |
| `NavBar.tsx` | Admin link (**UserMgnt**) is convenience only, never a permission check. The unread badge polls `/api/auth/notifications?summary=1` every minute and on the `notifications-changed` window event; keep that contract when changing notifications. Keep the phone-width menu working. |
| `SessionTimeout.tsx` | Compares against the absolute `sessionExpires` time, never a countdown counter, so background tabs stay correct. "Stay signed in" calls `extendSession`. |
| `CookieNotice.tsx` | A notice, not a consent prompt: only strictly necessary cookies plus the chosen theme exist. Never server-render it (no flash for returning visitors). Bump `NOTICE_VERSION` when wording or cookie use changes. If analytics or marketing cookies are ever added, replace it with real per-category consent first. |
| `ThemeToggle.tsx` | Header switch. Writes `localStorage["theme"]`; the pre-paint script in `layout.tsx` reads the same key. Change both together. |
| `ThemePicker.tsx` | Settings selector (System/Light/Dark). Same storage as `ThemeToggle`: "system" means the key is removed. |
| `TransactionForm.tsx` | Shared deposit/withdraw form (`kind` prop); any change hits both screens. Holder fields come from `HolderFields`. Backend accepts only US-style State (2 letters) and ZIP (5 digits). Only CHECKING and SAVINGS accounts are supported; closed accounts are refused. |
| `HolderFields.tsx` | Account holder details, Address and Contact subsections shared by deposit, withdraw and open-account. Required fields carry `required` and a red `*`. ZIP is digits only; phone is `123-456-7890` via `formatPhone`. Middle, Country and Phone are UI-only (the backend has no fields for them), so do not add them to request bodies. Use `clearFormFields` for Clear, not `form.reset()`. |
| `LocationCard.tsx` | Presentational server component for one branch/ATM (`PortalLocation`). Keep it data-only. |
| `StateBlock.tsx` | `Loading` and `ErrorMessage` only. `ErrorMessage` keeps `role="alert"`. |
| `HelpCenter.tsx` | Searchable FAQ over native `<details>`, fed `faqs` and `categories` from `lib/faq.ts`. Content changes go in `lib/faq.ts`, not here. Keep anchors (`/help#locked-out`) stable. |
| `LegalDocument.tsx` | Renders a `LegalDoc` from `lib/legal.ts` (title, date, contents, numbered sections). Server component. Wording changes go in `lib/legal.ts`; update its `LAST_UPDATED`. |
