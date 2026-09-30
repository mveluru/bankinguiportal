import { duration, num, plural } from "@/lib/duration";
import { RESET_TTL_MINUTES } from "@/lib/resets";
import { LOCKOUT_MS, MAX_FAILURES } from "@/lib/twofactor";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";

export interface Faq {
  id: string; // also the URL fragment, e.g. /help#locked-out
  category: string;
  question: string;
  answer: string[]; // one entry per paragraph
  note?: string;
  links?: { href: string; label: string }[];
}

export const FAQ_CATEGORIES = [
  "Getting started",
  "Signing in & security",
  "Accounts & transactions",
  "Notifications & settings",
  "Troubleshooting",
] as const;

/**
 * The help content. Numbers that come from configuration (lockout, session lengths, ...) are read from the
 * same env vars the app itself uses, so the answers can't drift from the behaviour. Bank rules that live in the
 * banking service (cash limit, minimum balances, statement range) are quoted as its defaults. Server-side only.
 */
export function buildFaqs(supportEmail?: string): Faq[] {
  const attempts = num(process.env.LOCKOUT_MAX_ATTEMPTS, 5);
  const lockMinutes = num(process.env.LOCKOUT_MINUTES, 15);
  const session = duration(num(process.env.SESSION_MAX_AGE_SECONDS, 8 * 3600));
  const remember = duration(num(process.env.REMEMBER_ME_MAX_AGE_SECONDS, 30 * 86400));
  const warning = duration(num(process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS, 120));
  const twoFactorLock = Math.round(LOCKOUT_MS / 60_000);

  return [
    // ---- Getting started ----
    {
      id: "what-can-i-do",
      category: "Getting started",
      question: "What can I do in this portal?",
      answer: [
        "View your accounts and recent activity, open a new account, deposit to and withdraw from checking and savings accounts, generate statements, find branches and ATMs, and manage your security and notification settings.",
      ],
      links: [{ href: "/", label: "Go to Home" }],
    },
    {
      id: "open-account",
      category: "Getting started",
      question: "How do I open an account?",
      answer: [
        "Choose Open an account in the menu, fill in your details and pick an account type. You must meet the bank's minimum age requirement.",
        "When it's created you'll see your new account number and the branches and ATMs in your state.",
      ],
      links: [{ href: "/accounts/open", label: "Open an account" }],
    },
    {
      id: "account-number",
      category: "Getting started",
      question: "Where do I find my account number?",
      answer: [
        "Your accounts are listed on the Home page. Checking accounts start with CH- and savings accounts with SV-, followed by 10 digits (for example CH-0000088291).",
      ],
    },

    // ---- Signing in & security ----
    {
      id: "forgot-password",
      category: "Signing in & security",
      question: "I forgot my password",
      answer: [
        `Choose Forgot password? on the sign-in page and enter your username. If it matches an account, a reset link is sent. It works once and expires after ${plural(RESET_TTL_MINUTES, "minute")}.`,
        "The page gives the same answer whether or not the username exists, so it can't be used to find out who has an account.",
      ],
      note: "Demo note: there is no email service yet, so the reset link is printed in the server console instead of being emailed.",
      links: [{ href: "/forgot-password", label: "Reset my password" }],
    },
    {
      id: "change-password",
      category: "Signing in & security",
      question: "How do I change my password?",
      answer: [`Go to Settings, then Password. Enter your current password and a new one of at least ${MIN_PASSWORD_LENGTH} characters.`],
      links: [{ href: "/settings/password", label: "Change password" }],
    },
    {
      id: "locked-out",
      category: "Signing in & security",
      question: "Why is my account locked?",
      answer: [
        `After ${attempts} wrong passwords in a row your username is locked for ${plural(lockMinutes, "minute")}, and during that time even the correct password is refused. It unlocks by itself, or an administrator can unlock it.`,
        "Completing a password reset also lifts the lock. The same limit applies to guessing your current password when changing it or turning off two-factor authentication.",
      ],
      links: [{ href: "/forgot-password", label: "Reset my password" }],
    },
    {
      id: "account-disabled",
      category: "Signing in & security",
      question: "It says my account has been disabled",
      answer: [
        "An administrator turned your account off. You were signed out everywhere and can't sign in until it is turned back on. Contact an administrator to find out why.",
      ],
    },
    {
      id: "two-factor",
      category: "Signing in & security",
      question: "What is two-factor authentication and how do I turn it on?",
      answer: [
        "It adds a second step at sign-in: after your password you enter a 6-digit code from an authenticator app such as Google Authenticator, Authy or 1Password.",
        "Go to Settings, then Two-factor authentication, scan the QR code and enter a code to confirm. You'll get 10 one-time recovery codes. They are shown only once, so save them somewhere safe.",
      ],
      links: [{ href: "/settings/two-factor", label: "Set up two-factor authentication" }],
    },
    {
      id: "lost-phone",
      category: "Signing in & security",
      question: "I lost my phone or can't get a code",
      answer: [
        "On the code screen choose Use a recovery code and enter one of the codes you saved. Each one works once.",
        "If you have no recovery codes, ask an administrator to reset your two-factor authentication, then set it up again on your new device.",
      ],
    },
    {
      id: "code-rejected",
      category: "Signing in & security",
      question: "My authentication code is rejected",
      answer: [
        `Codes change every 30 seconds and each can be used once. Make sure your phone's clock is set automatically, wait for the next code and try again. After ${MAX_FAILURES} wrong codes in a row, verification is locked for ${plural(twoFactorLock, "minute")}.`,
      ],
    },
    {
      id: "remember-me",
      category: "Signing in & security",
      question: "What does “Remember me on this device” do?",
      answer: [
        `It keeps you signed in on this device for up to ${remember}. Without it you're signed out when you close the browser, or after ${session}, whichever comes first.`,
        "Don't use it on a shared or public computer.",
      ],
    },
    {
      id: "signed-out",
      category: "Signing in & security",
      question: "Why was I signed out?",
      answer: [
        `Sessions last up to ${session}. About ${warning} before yours ends, a dialog with a countdown offers Stay signed in; if you don't respond you're signed out automatically.`,
        "An administrator disabling your account also ends your session immediately.",
      ],
    },
    {
      id: "suspicious-activity",
      category: "Signing in & security",
      question: "How can I tell if someone else used my account?",
      answer: [
        "Notifications alerts you to new-device sign-ins, failed attempts and security changes. Sign-in activity shows the full history, with the device and IP address of each event.",
        "If anything looks wrong, change your password and turn on two-factor authentication.",
      ],
      links: [
        { href: "/notifications", label: "Notifications" },
        { href: "/settings/activity", label: "Sign-in activity" },
      ],
    },
    {
      id: "cookies",
      category: "Signing in & security",
      question: "Does the portal use cookies?",
      answer: [
        "Only essential ones: one keeps you signed in, and a second lasts a few minutes while you enter a two-factor code. Your theme choice and the fact that you've dismissed the cookie notice are remembered in your browser's local storage.",
        "There are no advertising or analytics cookies and no third-party trackers, so there is nothing to opt out of.",
      ],
      links: [{ href: "/privacy#cookies", label: "Cookies in the Privacy Policy" }],
    },
    {
      id: "your-data",
      category: "Signing in & security",
      question: "What information does the portal keep about me?",
      answer: [
        "Your profile (display name and optional email), your security settings, your preferences, and a log of sign-in and security events with the time, IP address and device. Your accounts and transactions stay in the bank's banking service.",
        "The Privacy Policy lists everything, why it's kept, how long, and who can see it. The Terms of Use explain the rules for using the portal.",
      ],
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Use" },
      ],
    },
    {
      id: "admins",
      category: "Signing in & security",
      question: "What can administrators do to my account?",
      answer: [
        "Administrators can see the list of users, unlock accounts, reset two-factor authentication, and disable or enable users. They can't see your password or authentication secrets.",
        "Every action is recorded and appears in your own Sign-in activity and Notifications.",
      ],
    },

    // ---- Accounts & transactions ----
    {
      id: "deposit",
      category: "Accounts & transactions",
      question: "How do I make a deposit?",
      answer: [
        "Open the account and choose Deposit. Enter the amount and whether it's a check or cash. Cash deposits are limited to $5,000 by default; check deposits aren't.",
        "Only checking and savings accounts support deposits, and closed accounts can't be used.",
      ],
    },
    {
      id: "withdraw",
      category: "Accounts & transactions",
      question: "How do I make a withdrawal?",
      answer: [
        "Open the account and choose Withdraw. You need enough funds, and your balance must stay above the minimum after the withdrawal: $25 for checking and $100 for savings by default.",
        "A confirmation is sent to you by email or text.",
      ],
    },
    {
      id: "holder-details",
      category: "Accounts & transactions",
      question: "Why do deposits and withdrawals ask for my name and address?",
      answer: [
        "The bank's system requires the account holder's details with each transaction request. Your name is filled in for you; enter your address as it appears on the account.",
      ],
    },
    {
      id: "statement",
      category: "Accounts & transactions",
      question: "How do I get a statement?",
      answer: [
        "Open the account, choose Statement, pick a date range and press Generate statement. The range can be up to 18 months by default.",
        "Generating a statement also sends a copy by email or text, which is why it only runs when you press the button.",
      ],
    },
    {
      id: "missing-transactions",
      category: "Accounts & transactions",
      question: "Why don't I see all my transactions?",
      answer: [
        "An account page shows up to the 20 most recent transactions in the chosen window (7 to 90 days). Change the window on the page, or set your default in Settings. For older or complete history, generate a statement.",
      ],
      links: [{ href: "/settings", label: "Settings" }],
    },
    {
      id: "close-account",
      category: "Accounts & transactions",
      question: "How do I close an account?",
      answer: [
        "Open the account, choose Close account and type the account number to confirm. Closing is permanent: the account can't be reopened and no longer accepts deposits or withdrawals.",
        "The bank doesn't check for a zero balance when closing, so withdraw your money first.",
      ],
    },
    {
      id: "branches",
      category: "Accounts & transactions",
      question: "How do I find a branch or ATM?",
      answer: [
        "The Home page lists branches and ATMs with their hours, phone numbers and services. Enter a two-letter state code, for example TX, to filter the list.",
      ],
      links: [{ href: "/", label: "Go to Home" }],
    },

    // ---- Notifications & settings ----
    {
      id: "notifications",
      category: "Notifications & settings",
      question: "What notifications will I get?",
      answer: [
        "Security and account updates: new-device sign-ins, failed attempts before you signed in, lockouts, password and two-factor changes, and administrator actions on your account. The number next to the menu link shows what's unread; choose Mark all as read to clear it.",
        "In Settings you can switch off the optional kinds. Security-critical ones, such as a password change or a lockout, are always shown.",
      ],
      links: [
        { href: "/notifications", label: "Notifications" },
        { href: "/settings", label: "Settings" },
      ],
    },
    {
      id: "dark-mode",
      category: "Notifications & settings",
      question: "How do I switch to dark mode?",
      answer: [
        "Use the Dark/Light button in the header, or choose System, Light or Dark under Settings, then Appearance. System follows your device. The choice is saved on the device you're using.",
      ],
    },
    {
      id: "activity-window",
      category: "Notifications & settings",
      question: "What is the default activity window?",
      answer: [
        "It's how many days of recent activity an account page shows, and where a new statement's date range starts. Choose 7, 30, 60 or 90 days under Settings, then Preferences.",
      ],
      links: [{ href: "/settings", label: "Settings" }],
    },

    // ---- Troubleshooting ----
    {
      id: "cannot-reach-service",
      category: "Troubleshooting",
      question: "It says it can't reach the banking service",
      answer: [
        "The service may be down, or you may have reached the daily request limit (1,000 requests per customer per day by default), which browsers report the same way. Wait a little and try again.",
      ],
    },
    {
      id: "no-access",
      category: "Troubleshooting",
      question: "It says I don't have access to a page",
      answer: ["Administrator pages are only for administrators. If you need one, ask an administrator."],
    },
    {
      id: "contact-support",
      category: "Troubleshooting",
      question: "How do I contact support?",
      answer: [
        supportEmail
          ? `Email ${supportEmail} and include your username.`
          : "Contact an administrator and include your username.",
        "We will never ask for your password or authentication codes. Don't share them with anyone.",
      ],
      ...(supportEmail ? { links: [{ href: `mailto:${supportEmail}`, label: `Email ${supportEmail}` }] } : {}),
    },
  ];
}
