---
name: components
description: Rules for shared React components in components/ plus per-component rules (NavBar, AuthProvider, auth/, accounts/, HolderFields, TransactionForm, CookieNotice and others). Use when adding or editing a component.
---

# Components (`components/`)

**Job:** reusable UI shared by pages or the root layout.

Rules:
- Responsive by default: no fixed widths wider than a 320px screen, text wraps, 44px touch targets. A new component is not done until the screens that use it pass `e2e/mobile.spec.ts`.
- Responsive by default: no fixed widths wider than a 320px screen, text wraps, 44px touch targets. A component is not done until the
  screens that use it pass `e2e/mobile.spec.ts` (iPhone and Samsung profiles).
- Default export, one component per file, props typed inline or with a local interface.
- Mark `"use client"` only if it uses state, effects, or browser APIs. Leave presentational ones as server components.
- No `node:` imports and no direct file or backend access; get data through props, `useAuth`, or `lib/api.ts` (never `fetch` the backend directly).
- Use the existing CSS classes (`card`, `badge`, `muted`, `error`, `row`, `stack`, `subsection`, `req`, `actions`).
  Add new styles to `app/globals.css` with theme variables, so light and dark both work.
- Interactive elements need labels; use native elements (`<details>`, `<dialog>`, `<label>`) before custom ones.
- Touch targets are at least 44px at phone width (see the media query in `globals.css`).

### Per-component rules

| Component | Rules |
|---|---|
| `AuthProvider.tsx` | Single source of the signed-in user (`useAuth`, a `SessionUser`). Auth transitions (login, logout, expiry) end in `hardNavigate` from `lib/navigation.ts`, never `router.replace`; `expireSession` lands on the user's own sign-in page. `can(user, privilege)` is for hiding UI only. Wrap it once, in `layout.tsx`. |
| `NavBar.tsx` | Top bar only (brand, theme switch). Do not put feature links back in it. |
| `SideNav.tsx` | All feature navigation lives here, as buttons in the light-blue left panel (colours are `--side-*` variables so dark mode works). Items are chosen by `user.kind` and filtered with `can()`, which is convenience only, never a permission check (**UserMgnt** = employees). A new feature needs a button here for the roles that may use it. Keep the phone-width strip working. |
| `auth/*` | Shared by both portals through a `kind` prop. Passwords are 8 digits (`lib/passwords.ts`). After a password change the session is gone (the backend revokes every token), so show "sign in again", do not keep using the API. |
| `accounts/*` | `AccountDetail` and `CloseAccount` serve both portals; `SuspendAccount`, `ReactivateAccount` and `OpenAccount` are staff-only; suspend/reactivate go through `useStaffAccount`, which redirects a role without the privilege (managers and above have it) so tellers never see the page. Use `accountHref(kind, n, tail)` for links so staff stay under `/staff`. Customers get no suspend, reactivate or open actions. |
| `RateLimitNotice.tsx` | The only place the daily request limit (429) is shown: a modal, once per exceeded limit. `StateBlock.ErrorMessage` shows a short grey "not available right now" note for that message, so render API errors only through it. |
| `Greeting.tsx` | The welcome banner must never persist: keep its state in `lib/greeting.ts` (not `useState`, since Next keeps hidden pages mounted-in-memory) and keep `GreetingReset` in `layout.tsx`. |
| (all) | Must fit a 320px phone: no fixed widths wider than the screen, long text wraps, wide tables sit in `.table-wrap`. `e2e/mobile.spec.ts` walks every screen on iPhone and Samsung profiles and fails on sideways overflow, so add new screens to its lists. |
| `CredentialAdmin.tsx` | Staff forms to set a login's status, set a password, create a login. They only call the functions passed in; the backend enforces the privilege. |
| `SessionTimeout.tsx` | Compares against the absolute `sessionExpires` time (the token's `exp`), never a countdown counter, so background tabs stay correct. There is no "stay signed in": the backend has no refresh. |
| `IdleLogout.tsx` | Signs out after `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS` (default 120) with no activity on any tab, via `expireSession` (lands on `?expired=1` of the sign-in page). Last activity lives in `localStorage["lastActivity"]` so tabs share one clock; compare wall-clock time, not a counter. Every page must stay covered: it is mounted once in `layout.tsx`, so do not unmount it on any route. |
| `CookieNotice.tsx` | A notice, not a consent prompt: only strictly necessary cookies plus the chosen theme exist. Never server-render it (no flash for returning visitors). Bump `NOTICE_VERSION` when wording or cookie use changes. If analytics or marketing cookies are ever added, replace it with real per-category consent first. |
| `ThemeToggle.tsx` | Header switch. Writes `localStorage["theme"]`; the pre-paint script in `layout.tsx` reads the same key. Change both together. |
| `ThemePicker.tsx` | Settings selector (System/Light/Dark). Same storage as `ThemeToggle`: "system" means the key is removed. |
| `TransactionForm.tsx` | Shared deposit/withdraw form (`kind` prop) for both portals (`portal` prop); any change hits all four screens. Area managers (staff with `branch === null`) must give a branch/ATM id. Holder fields come from `HolderFields`. Backend accepts only US-style State (2 letters) and ZIP (5 digits). Only CHECKING and SAVINGS accounts are supported; closed accounts are refused. |
| `HolderFields.tsx` | Account holder details, Address and Contact subsections shared by deposit, withdraw and the staff open-account form. Required fields carry `required` and a red `*`. ZIP is digits only; phone is `123-456-7890` via `formatPhone`. Middle, Country and Phone are UI-only (the backend has no fields for them), so do not add them to request bodies. Use `clearFormFields` for Clear, not `form.reset()`. |
| `LocationCard.tsx` | Presentational server component for one branch/ATM (`PortalLocation`). Keep it data-only. |
| `StateBlock.tsx` | `Loading` and `ErrorMessage` only. `ErrorMessage` keeps `role="alert"`. |
| `HelpCenter.tsx` | Searchable FAQ over native `<details>`, fed `faqs` and `categories` from `lib/faq.ts`. Content changes go in `lib/faq.ts`, not here. Keep anchors (`/help#locked-out`) stable. |
| `LegalDocument.tsx` | Renders a `LegalDoc` from `lib/legal.ts` (title, date, contents, numbered sections). Server component. Wording changes go in `lib/legal.ts`; update its `LAST_UPDATED`. |
