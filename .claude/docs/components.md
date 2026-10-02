# Components (`components/`)

| Component | Type | Used for |
|---|---|---|
| `AuthProvider.tsx` | client | React context holding the signed-in user (`useAuth`): `login(kind, …)`, `logout`, `expireSession`; plus `can(user, privilege)` for staff. |
| `NavBar.tsx` | client | Top bar only: brand (staff: name and employee id, with their branch beneath when they have one) Sign out (`SignOutButton`, with its confirm dialog) and the theme switch. |
| `SideNav.tsx` | client | The left-hand light-blue panel of feature buttons (Sign out is not here: it is `SignOutButton` in the top bar); customer or staff items by `user.kind`, staff items filtered by privilege (**UserMgnt** = employees). Highlights the current section. For staff the role (Area Manager / Manager / Teller) is a button above the others; clicking it lists the role's permissions. Hidden when signed out. |
| `SessionTimeout.tsx` | client | Countdown dialog before the token expires; signs out at expiry using the absolute expiry time. No "stay signed in" (the backend has no refresh). |
| `IdleLogout.tsx` | client | Signs the user out after `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS` (default 120) without activity on any tab; lands on the portal's sign-in page with `?expired=1`. |
| `auth/SignInForm.tsx`, `ForgotPassword.tsx`, `ChangePassword.tsx`, `SecurityQuestions.tsx`, `SettingsHome.tsx` | client | Credential screens shared by both portals (`kind` prop). |
| `accounts/AccountDetail.tsx`, `CloseAccount.tsx`, `SuspendAccount.tsx`, `ReactivateAccount.tsx`, `OpenAccount.tsx` | client | Account screens. `AccountDetail` and `CloseAccount` serve both portals; the rest are staff-only. `useStaffAccount` loads the account and redirects roles without the privilege (suspend/reactivate: managers and above). |
| `Greeting.tsx` | client | One-time welcome banner on the landing screen (`Greeting`, also removes itself after 20 seconds) and the layout-level `GreetingReset` that clears it on the first navigation. |
| `accounts/AccountLookup.tsx` | client | "Go to account number" (blank, 16 characters) plus the big square scrollable box on the right that shows the account (`AccountDetail` in `embedded` mode) when View is pressed. Used on the customer home and the staff dashboard. |
| `SignOutButton.tsx` | client | Sign out with its confirm dialog; rendered in the top bar next to the theme switch. |
| `accounts/StatementViewer.tsx` | client | Date range, Generate, then Print and Download CSV for one account. Used by `/accounts/[n]/statement` and the `/statements` page (which adds an account picker). Generating emails/texts the statement, so only on a button press. |
| `CredentialAdmin.tsx` | client | Forms used by staff on a login: set status, set password, create login. |
| `CookieNotice.tsx` | client | Dismissible cookie *notice* (not a consent prompt); remembered in localStorage, versioned. |
| `ThemeToggle.tsx` | client | Header light/dark switch. |
| `ThemePicker.tsx` | client | System/Light/Dark selector on the settings hub; same storage as the toggle. |
| `TransactionForm.tsx` | client | Shared withdraw/deposit form for both portals (`kind` and `portal` props); see [Transaction form layout](#transaction-form-layout). |
| `HolderFields.tsx` | client | Account holder details, Address and Contact subsections shared by the deposit, withdraw and open-account forms; also exports `clearFormFields`. |
| `LocationCard.tsx` | server | One branch/ATM card on the home page. |
| `StateBlock.tsx` | server | `Loading` and `ErrorMessage` placeholders for fetch states. |
| `HelpCenter.tsx` | client | Searchable FAQ using native `<details>`. |
| `LegalDocument.tsx` | server | Renders a legal document with contents list and numbered sections. |

### Transaction form layout

Screens share one set of holder fields, `HolderFields.tsx`: deposit and withdraw (`TransactionForm`, via its `kind` prop, in both portals) and `/staff/accounts/open` (`components/accounts/OpenAccount.tsx`). A change to the
subsections below therefore applies to all of them. Staff area managers (no home branch) also get a required Branch / ATM id field. Top to bottom:

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
