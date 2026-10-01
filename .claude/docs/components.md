# Components (`components/`)

| Component | Type | Used for |
|---|---|---|
| `AuthProvider.tsx` | client | React context holding the signed-in user (`useAuth`): `login`, `verifyTwoFactor`, `logout`, `refresh`, `extendSession`, `expireSession`. Also sets the customer ID used by `lib/api.ts`. |
| `NavBar.tsx` | client | Header links, admin link, unread-notification badge (polled every minute), sign-out dialog, phone-width menu. |
| `SessionTimeout.tsx` | client | Countdown dialog before expiry with "Stay signed in"; signs out at expiry using the absolute expiry time. |
| `IdleLogout.tsx` | client | Signs the user out after `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS` (default 120) without activity on any tab; lands on `/login?expired=1`. |
| `CookieNotice.tsx` | client | Dismissible cookie *notice* (not a consent prompt); remembered in localStorage, versioned. |
| `ThemeToggle.tsx` | client | Header light/dark switch. |
| `ThemePicker.tsx` | client | System/Light/Dark selector on the settings page; same storage as the toggle. |
| `TransactionForm.tsx` | client | Shared withdraw/deposit form; see [Transaction form layout](#transaction-form-layout). |
| `HolderFields.tsx` | client | Account holder details, Address and Contact subsections shared by the deposit, withdraw and open-account forms; also exports `clearFormFields`. |
| `LocationCard.tsx` | server | One branch/ATM card on the home page. |
| `StateBlock.tsx` | server | `Loading` and `ErrorMessage` placeholders for fetch states. |
| `HelpCenter.tsx` | client | Searchable FAQ using native `<details>`. |
| `LegalDocument.tsx` | server | Renders a legal document with contents list and numbered sections. |

### Transaction form layout

Three screens share one set of holder fields, `HolderFields.tsx`: `/accounts/[accountNumber]/deposit` and `/withdraw`
(both `TransactionForm`, via its `kind` prop) and `/accounts/open` (`app/accounts/open/page.tsx`). A change to the
subsections below therefore applies to all three. Top to bottom:

1. The screen's own leading fields: Amount\* (required) and Deposit type (deposit only), or Account type (open account).
2. **Account holder details** subsection: a red `* indicates required` note, then First name\*, Middle and Last name\*
   in one row. First and last names are prefilled from the account overview on deposit/withdraw. Open account adds a
   Date of birth\* row (`showDob`).
3. **Address** subsection, fields in horizontal rows that wrap on narrow screens:
   Street\*, Address line 1\*, Address line 2, then City\*, State\*, ZIP\*, Country\* (default `USA`).
4. **Contact** subsection: Phone number\* (required).
5. Error message (open account also shows the Terms/Privacy line), then a centred button row: the submit button
   (Deposit / Withdraw / Open account) and **Clear**, both in the brand blue.

Details:

- **ZIP** accepts digits only: an `onInput` handler strips anything else as it is typed, it is capped at 5 characters,
  and `inputMode="numeric"` brings up the numeric keypad on phones.
- **Phone number** shows a grey `xxx-xxx-xxxx` placeholder. Only digits and hyphens can end up in the box: an `onInput`
  handler (`formatPhone`) keeps the digits (max 10) and inserts the hyphens itself. It is required and must match
  `123-456-7890`.
- **Middle and Country are UI-only.** The backend (`AccountHolderDetails` in `lib/types.ts`) has no fields for
  them, so they are collected but not sent. **Phone is sent only by open-account** (`phoneNumber`, required
  `###-###-####`, stored on the customer); deposit and withdraw ignore it. Its State (2 letters) and ZIP (5 digits) rules still apply, so a non-US
  country will fail validation.
- **Clear** (`clearFormFields`) empties every field, including prefilled names (a native reset would restore them).
  Country returns to `USA`, selects to their first option, and each screen removes its error message.
- **Styling** lives in `app/globals.css`: `form.stack.wide` (wider form), `fieldset.subsection` (bordered group),
  `.req` (red asterisk), `.narrow` labels (State, ZIP), `.narrow-phone`, `.narrow-dob`, and `.actions` (centred button
  row). Fields flex within `.row`.
