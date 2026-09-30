import { duration, num, plural } from "@/lib/duration";
import { RESET_TTL_MINUTES } from "@/lib/resets";

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
const LAST_UPDATED = "September 30, 2026";

/** Operator details come from configuration so nothing is invented here. Server-side only. */
function config() {
  const email = process.env.SUPPORT_EMAIL?.trim() || undefined;
  return {
    entity: process.env.LEGAL_ENTITY_NAME?.trim() || "Brite Banking",
    email,
    contact: email ? `email ${email}` : "contact an administrator",
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
  const lockMinutes = num(process.env.LOCKOUT_MINUTES, 15);
  const session = duration(num(process.env.SESSION_MAX_AGE_SECONDS, 8 * 3600));
  const remember = duration(num(process.env.REMEMBER_ME_MAX_AGE_SECONDS, 30 * 86400));

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
                ["Sign-in details", "Your username, and your password as a salted hash once you've set one in the portal", "To sign you in", "Until your account is removed; a new password replaces the old hash"],
                ["Profile", "Display name and email address (both optional)", "To personalize the portal and to reach you", "Until you change or clear them"],
                ["Security settings", "Your two-factor secret (encrypted), recovery codes (hashed), failed-attempt counters, and whether an administrator has disabled your account", "To protect your account", `Two-factor data until you turn it off; failed-attempt counters expire after ${plural(lockMinutes, "minute")}`],
                ["Sign-in and security log", "The time, type of event, username, IP address and browser or device details for sign-ins, sign-outs, failed attempts, password and two-factor changes, and administrator actions", "To show you your own history, detect misuse and investigate incidents", "Until the log rotates. It keeps a fixed amount of recent history, not a set number of days"],
                ["Preferences and notifications", "Your default activity window, notification choices and the time you last marked notifications read", "To remember your settings", "Until you change them"],
                ["Password reset requests", "A one-time random token, stored only as a hash", "To let you reset a forgotten password", `${plural(RESET_TTL_MINUTES, "minute")}, or until used`],
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
                ["bank_session (cookie)", "Keeps you signed in. It's signed, can't be read by scripts on the page, and is essential for the portal to work", `Until you close the browser or ${session}, whichever is first. With “Remember me”, up to ${remember}`],
                ["bank_2fa_pending (cookie)", "Remembers that your password was accepted while you enter your two-factor code", "5 minutes"],
                ["theme (local storage)", "Remembers your Light, Dark or System theme on this device", "Until you clear your browser's site data"],
              ],
            },
          },
          { p: "The portal doesn't use advertising or analytics cookies, and doesn't load third-party trackers." },
        ],
      },
      {
        id: "use",
        title: "How we use information",
        blocks: [
          { ul: [
            "To run the portal: signing you in, showing your accounts and passing your transactions to the bank.",
            "To keep accounts safe: limiting requests, locking an account after repeated failed sign-ins, ending sessions and, when needed, disabling accounts.",
            "To keep you informed: showing your own sign-in history and security notifications.",
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
            "You can see your own profile, settings, notifications and sign-in history.",
            "Administrators can see a user list showing each person's username, name, email, customer ID, whether two-factor is on, whether the account is locked or disabled, last sign-in and recent failed attempts. They can't see passwords or two-factor secrets. Every administrator action is recorded and appears in the affected person's own sign-in history and notifications.",
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
            "Passwords you set are stored only as salted hashes.",
            "Two-factor secrets are encrypted, and recovery codes are stored hashed and work once.",
            "Sign-in sessions use signed, script-inaccessible cookies (marked Secure in production) and can be ended by an administrator immediately.",
            "Repeated failed sign-ins and two-factor codes lock the account for a short time, and requests are rate limited.",
            "Security-relevant events are logged and shown to you.",
          ] },
          { p: "No system is perfectly secure. Please choose a strong password, turn on two-factor authentication, and never share your password or codes." },
        ],
      },
      {
        id: "choices",
        title: "Your choices",
        links: [
          { href: "/settings", label: "Settings" },
          { href: "/settings/activity", label: "Sign-in activity" },
        ],
        blocks: [
          { ul: [
            "Edit or clear your display name and email in Settings.",
            "Change your preferences and which optional notifications you receive in Settings.",
            "Review your sign-in history, and turn on two-factor authentication.",
            "Sign out at any time, or choose whether to use “Remember me” on a device.",
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
  const attempts = num(process.env.LOCKOUT_MAX_ATTEMPTS, 5);

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
          "Keep your password, authentication codes and recovery codes confidential, and don't share them with anyone.",
          "You're responsible for activity under your account until you tell us it wasn't you, so tell us promptly if you notice anything unusual.",
          "We recommend turning on two-factor authentication.",
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
          "Closing an account is permanent and can't be undone from the portal.",
          "Confirmations for some actions, such as withdrawals and statements, are sent by email or text.",
        ] },
      ],
    },
    {
      id: "protecting",
      title: "Steps we may take to protect accounts",
      blocks: [{ p: `To protect you and the portal we may lock an account after ${plural(attempts, "failed sign-in attempt")} in a row, end sessions after a set time, limit the number of requests, and suspend or disable an account when we think it's at risk or being misused.` }],
    },
    {
      id: "availability",
      title: "Availability",
      blocks: [{ p: "We aim to keep the portal running, but it's provided on an “as available” basis. It may be unavailable from time to time, for example for maintenance, and features may change." }],
    },
    {
      id: "communications",
      title: "Communications",
      blocks: [{ p: "We may send you messages about your account and its security, including notifications in the portal and confirmations by email or text. Optional notifications can be switched off in Settings; security-critical ones can't." }],
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
