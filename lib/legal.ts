
export type LegalBlock = { p: string } | { ul: string[] } | { table: { head: string[]; rows: string[][] } };
export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
  links?: { href: string; label: string }[];
}
export interface LegalDoc {
  title: string;
  updated: string; // shown as-is; bump when the text changes
  intro: string;
  sections: LegalSection[];
  /** True when the operator hasn't said a lawyer reviewed this text (shows a visible notice). */
  templateNotice: boolean;
}

/** Date the wording below was last changed. Update it whenever you edit the text. */
const LAST_UPDATED = "October 1, 2026";

/** Operator details come from configuration so nothing is invented here. Server-side only. */
function config() {
  const email = process.env.SUPPORT_EMAIL?.trim() || undefined;
  return {
    entity: process.env.LEGAL_ENTITY_NAME?.trim() || "Brite Banking",
    email,
    contact: email ? `email ${email}` : "contact your branch",
    governingLaw: process.env.LEGAL_GOVERNING_LAW?.trim() || undefined,
    templateNotice: process.env.LEGAL_REVIEWED?.trim().toLowerCase() !== "true",
  };
}

/**
 * Privacy Policy. Every statement describes what this portal actually does (what it stores, sets and shows), and
 * the durations are read from the same configuration the app uses, so it can't drift from the behaviour.
 */
export function privacyDoc(): LegalDoc {
  const c = config();

  return {
    title: "Privacy Policy",
    updated: LAST_UPDATED,
    templateNotice: c.templateNotice,
    intro: `${c.entity} runs this online banking portal. This policy explains what information the portal handles, why, who can see it, how long it's kept and the choices you have. Your accounts and transactions are held by the bank's banking service; the portal passes your requests to it.`,
    sections: [
      {
        id: "information",
        title: "Information we handle",
        blocks: [
          {
            table: {
              head: ["Information", "What it includes", "Why", "How long"],
              rows: [
                ["Sign-in details", "Your username and password. You type them into the portal, which passes them straight to the banking service; the portal doesn't store or log them. The bank keeps only a hash of the password", "To sign you in", "Held by the bank until your login is removed; a new password replaces the old hash"],
                ["Sign-in token", "A time-limited token the bank issues when you sign in, plus your name (and, for staff, employee number, role and branch)", "To keep you signed in and to show your name", "Until it expires (the bank sets the lifetime), you sign out, or you change your password"],
                ["Security questions", "The three questions you chose and your answers, held by the bank (answers are not shown back to anyone)", "To let you reset a forgotten password", "Until you replace them"],
                ["Login status", "Whether your login is active, inactive, locked or suspended, why, and failed-attempt counters", "To protect your account", "Held by the bank"],
                ["Banking data", "Accounts, balances, transactions, statements, and the name and address you enter with a deposit or withdrawal", "Provided by the bank's banking service. The portal passes your requests through and doesn't keep its own copy", "As set by the bank"],
              ],
            },
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies and local storage",
        blocks: [
          {
            table: {
              head: ["Name", "Purpose", "How long"],
              rows: [
                ["bank_token (cookie)", "Holds your sign-in token. It can't be read by scripts on the page and is essential for the portal to work", "Until your token expires or you sign out"],
                ["bank_profile (cookie)", "Holds your name and, for staff, role and branch, so pages can show them", "Same as the sign-in token"],
                ["theme (local storage)", "Remembers your Light, Dark or System theme on this device", "Until you clear your browser's site data"],
                ["cookie_notice_ack (local storage)", "Remembers that you've seen the cookie notice, so it isn't shown again", "Until you clear your browser's site data"],
              ],
            },
          },
          { p: "All of these are strictly necessary for the portal to work or are choices you made yourself, so the portal shows a cookie notice rather than asking for consent. It doesn't use advertising or analytics cookies, and doesn't load third-party trackers." },
        ],
      },
      {
        id: "use",
        title: "How we use information",
        blocks: [
          { ul: [
            "To run the portal: signing you in, showing your accounts and passing your transactions to the bank.",
            "To keep accounts safe: the bank limits requests, locks a login after repeated failed sign-ins, ends sessions and, when needed, suspends logins.",
            "To help you: answering support requests and investigating problems.",
          ] },
          { p: "The portal doesn't sell your information or share it with advertisers." },
        ],
      },
      {
        id: "sharing",
        title: "Who can see it",
        blocks: [
          { ul: [
            "You can see your own accounts and transactions. Customers can't see anyone else's.",
            "Bank employees can see account information their role allows, and the bank records which employee handled each transaction. Managers can set a customer's login status or password and area managers can do the same for employees; they can't see passwords or security answers.",
            "The bank and its banking service handle your accounts and transactions, and send any confirmations by email or text.",
            "The portal doesn't send your information to analytics or advertising services.",
          ] },
        ],
      },
      {
        id: "security",
        title: "How we protect it",
        blocks: [
          { ul: [
            "Passwords are checked and stored (as hashes) by the bank, never by the portal.",
            "Your sign-in token is kept in a script-inaccessible cookie (marked Secure in production) and the portal adds it to your requests on the server, so scripts in your browser never see it.",
            "The bank checks your login on every request, so suspending or locking it, or changing the password, stops an existing session at once.",
            "Repeated failed sign-ins and security answers lock the login for a short time, and requests are rate limited.",
          ] },
          { p: "No system is perfectly secure. Please choose a password that is hard to guess, set your security questions, and never share your password or answers." },
        ],
      },
      {
        id: "choices",
        title: "Your choices",
        links: [{ href: "/settings", label: "Settings" }],
        blocks: [
          { ul: [
            "Change your password and your security questions in Settings.",
            "Sign out at any time.",
          ] },
          { p: `To ask to see, correct or delete information we hold about you, ${c.contact}. Some security records may need to be kept for a period so we can protect accounts and meet our obligations.` },
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        blocks: [{ p: "If we change how the portal handles information, we'll update this page and the date at the top." }],
      },
      {
        id: "contact",
        title: "Contact",
        blocks: [{ p: `Questions about this policy? ${c.contact.charAt(0).toUpperCase()}${c.contact.slice(1)}.` }],
      },
    ],
  };
}

/** Terms of Use: a conventional template. Company name, contact and governing law come from configuration. */
export function termsDoc(): LegalDoc {
  const c = config();

  const sections: LegalSection[] = [
    {
      id: "agreement",
      title: "Agreement",
      links: [{ href: "/privacy", label: "Privacy Policy" }],
      blocks: [{ p: `By signing in to or using this portal you agree to these terms and to the Privacy Policy. If you don't agree, please don't use the portal. In these terms, “we” means ${c.entity}.` }],
    },
    {
      id: "account",
      title: "Your account",
      blocks: [
        { ul: [
          "Give accurate information and keep it up to date.",
          "Keep your password and security answers confidential, and don't share them with anyone.",
          "You're responsible for activity under your account until you tell us it wasn't you, so tell us promptly if you notice anything unusual.",
          "Set your security questions so you can reset a forgotten password yourself.",
        ] },
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      blocks: [
        { p: "You agree not to:" },
        { ul: [
          "access or try to access another person's account, or areas of the portal you haven't been given access to;",
          "probe, scan or test the portal for weaknesses without our written permission;",
          "get around limits or protections, including rate limits and account lockouts;",
          "use bots or other automated means to sign in or make requests;",
          "interfere with or overload the portal, or use it for anything unlawful.",
        ] },
      ],
    },
    {
      id: "banking",
      title: "Banking services and transactions",
      blocks: [
        { p: "Accounts, deposits, withdrawals, statements and branch information are provided through the bank's banking service, and are subject to your account agreement with the bank, including its limits, minimum balances and fees. Transactions can be declined if they don't meet those rules." },
        { ul: [
          "You're responsible for the accuracy of the details you enter.",
          "Closing an account is permanent and can't be undone.",
          "Accounts are opened by bank staff at the office; the portal doesn't open accounts for customers.",
          "Confirmations for some actions, such as withdrawals and statements, are sent by email or text.",
        ] },
      ],
    },
    {
      id: "protecting",
      title: "Steps we may take to protect accounts",
      blocks: [{ p: "To protect you and the portal the bank may lock a login after repeated failed sign-in attempts, end sessions after a set time, limit the number of requests, and suspend an account or a login when it's thought to be at risk or being misused." }],
    },
    {
      id: "availability",
      title: "Availability",
      blocks: [{ p: "We aim to keep the portal running, but it's provided on an “as available” basis. It may be unavailable from time to time, for example for maintenance, and features may change." }],
    },
    {
      id: "communications",
      title: "Communications",
      blocks: [{ p: "We may send you messages about your account and its security, including confirmations by email or text." }],
    },
    {
      id: "privacy",
      title: "Privacy",
      links: [{ href: "/privacy", label: "Read the Privacy Policy" }],
      blocks: [{ p: "How the portal handles your information is described in the Privacy Policy." }],
    },
    {
      id: "liability",
      title: "Disclaimers and limits of liability",
      blocks: [{ p: "To the extent the law allows, the portal is provided “as is” without warranties of any kind, and we aren't liable for indirect or consequential losses arising from your use of it. Nothing in these terms limits any right or liability that can't be limited by law, including under your account agreement with the bank." }],
    },
    {
      id: "ending",
      title: "Ending your access",
      blocks: [{ p: "You can stop using the portal at any time. We may suspend or end your access if you break these terms or if we need to protect you, other customers or the portal." }],
    },
    {
      id: "changes",
      title: "Changes to these terms",
      blocks: [{ p: "We may update these terms. We'll change the date at the top when we do, and using the portal after that means you accept the updated terms." }],
    },
  ];

  if (c.governingLaw) {
    sections.push({ id: "law", title: "Governing law", blocks: [{ p: `These terms are governed by the laws of ${c.governingLaw}.` }] });
  }
  sections.push({ id: "contact", title: "Contact", blocks: [{ p: `Questions about these terms? ${c.contact.charAt(0).toUpperCase()}${c.contact.slice(1)}.` }] });

  return {
    title: "Terms of Use",
    updated: LAST_UPDATED,
    templateNotice: c.templateNotice,
    intro: "These terms set out the rules for using this online banking portal.",
    sections,
  };
}
