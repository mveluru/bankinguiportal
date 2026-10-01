import { duration, num } from "@/lib/duration";
import { PASSWORD_HINT } from "@/lib/passwords";

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
  "Settings",
  "For staff",
  "Troubleshooting",
] as const;

/**
 * The help content. Numbers that come from configuration (timeout warning, idle logout) are read from the
 * same env vars the app itself uses, so the answers can't drift from the behaviour. Bank rules that live in the
 * banking service (sign-in lockout, token lifetime, cash limit, minimum balances, statement range) are described, not quoted
 * as portal settings. Server-side only.
 */
export function buildFaqs(supportEmail?: string): Faq[] {
  const warning = duration(num(process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS, 120));
  const idle = duration(num(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS, 120));

  return [
    // ---- Getting started ----
    {
      id: "what-can-i-do",
      category: "Getting started",
      question: "What can I do in this portal?",
      answer: [
        "Customers can view their accounts and recent activity, deposit to and withdraw from checking and savings accounts, generate statements, close an account and find branches and ATMs. Bank staff use a separate staff portal to open accounts, suspend and reactivate them, and manage logins.",
      ],
      links: [{ href: "/", label: "Go to Home" }],
    },
    {
      id: "open-account",
      category: "Getting started",
      question: "How do I open an account?",
      answer: [
        "Accounts are opened by bank staff at a branch. Bring identification; the teller opens the account and a manager creates your online login, after which you can sign in here.",
      ],
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
        "Choose Forgot password? on the sign-in page, enter your username and answer the three security questions you chose, then pick a new password.",
        "You can only do this if you set security questions beforehand (Settings, then Security questions). Otherwise a bank employee has to set a new password for you.",
      ],
      links: [{ href: "/forgot-password", label: "Reset my password" }],
    },
    {
      id: "change-password",
      category: "Signing in & security",
      question: "How do I change my password?",
      answer: [
        `Go to Settings, then Password. Enter your current password and a new one: ${PASSWORD_HINT}. Changing it signs you out everywhere, so sign in again with the new one.`,
      ],
      links: [{ href: "/settings/password", label: "Change password" }],
    },
    {
      id: "security-questions",
      category: "Signing in & security",
      question: "What are security questions?",
      answer: [
        "You choose three questions from a fixed list and answer them. They are the only way you can reset a forgotten password yourself. Saving new ones replaces the old ones and needs your current password.",
      ],
      links: [{ href: "/settings/security-questions", label: "Set security questions" }],
    },
    {
      id: "locked-out",
      category: "Signing in & security",
      question: "Why is my login locked?",
      answer: [
        "The bank locks a login after too many wrong passwords, or wrong security answers, in a row. A lock caused by wrong passwords ends by itself after a while; a bank employee can also lift it. While it lasts, even the correct password is refused.",
      ],
      links: [{ href: "/forgot-password", label: "Reset my password" }],
    },
    {
      id: "login-not-active",
      category: "Signing in & security",
      question: "It says my login is not active",
      answer: [
        "A bank employee set your login to Inactive, Locked or Suspended. You can't sign in or make transactions until it is set back to Active, and the change applies at once, even if you were already signed in. Contact your branch.",
      ],
    },
    {
      id: "signed-out",
      category: "Signing in & security",
      question: "Why was I signed out?",
      answer: [
        `Your sign-in lasts a limited time, set by the bank. About ${warning} before it ends a dialog counts down, and then you're signed out automatically; sign in again to continue. You're also signed out after ${idle} without any activity on the portal.`,
        "Changing your password, or an employee suspending your login, ends your session immediately.",
      ],
    },
    {
      id: "cookies",
      category: "Signing in & security",
      question: "Does the portal use cookies?",
      answer: [
        "Only essential ones: two hold your sign-in (they can't be read by scripts on the page) and are removed when you sign out. Your theme choice and the fact that you've dismissed the cookie notice are remembered in your browser's local storage.",
        "There are no advertising or analytics cookies and no third-party trackers, so there is nothing to opt out of.",
      ],
      links: [{ href: "/privacy#cookies", label: "Cookies in the Privacy Policy" }],
    },
    {
      id: "your-data",
      category: "Signing in & security",
      question: "What information does the portal keep about me?",
      answer: [
        "The portal itself keeps nothing about you on its server. Your sign-in, accounts and transactions are held by the bank's banking service; the portal only passes your requests to it.",
        "The Privacy Policy lists what is kept, why, and who can see it. The Terms of Use explain the rules for using the portal.",
      ],
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Use" },
      ],
    },

    // ---- Accounts & transactions ----
    {
      id: "deposit",
      category: "Accounts & transactions",
      question: "How do I make a deposit?",
      answer: [
        "Open the account and choose Deposit. Enter the amount and whether it's a check or cash. Cash deposits are limited to $5,000 by default; check deposits aren't.",
        "Only checking and savings accounts support deposits, and closed or suspended accounts can't be used.",
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
      id: "suspended-account",
      category: "Accounts & transactions",
      question: "My account is suspended",
      answer: [
        "A suspended account is read-only: deposits and withdrawals are refused until a bank manager reactivates it or its end time passes. Customers can't suspend or reactivate accounts; contact your branch.",
      ],
    },
    {
      id: "missing-transactions",
      category: "Accounts & transactions",
      question: "Why don't I see all my transactions?",
      answer: [
        "An account page shows up to the 20 most recent transactions in the chosen window (7 to 90 days). Change the window on the page. For older or complete history, generate a statement.",
      ],
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

    // ---- Settings ----
    {
      id: "dark-mode",
      category: "Settings",
      question: "How do I switch to dark mode?",
      answer: [
        "Use the Dark/Light button in the header, or choose System, Light or Dark under Settings, then Appearance. System follows your device. The choice is saved on the device you're using.",
      ],
    },

    // ---- For staff ----
    {
      id: "staff-sign-in",
      category: "For staff",
      question: "How do bank employees sign in?",
      answer: [
        "Use the Staff sign in page with your employee username and password. Your role decides what you can do: tellers look up accounts, open accounts and handle deposits and withdrawals; managers also suspend, reactivate and close accounts and manage customer logins; area managers also manage employees.",
        "The portal hides what your role can't do, and the bank refuses it again if you try.",
      ],
      links: [{ href: "/staff/login", label: "Staff sign in" }],
    },
    {
      id: "staff-open-account",
      category: "For staff",
      question: "How do I open an account for a customer?",
      answer: [
        "Choose Open an account in the staff menu, enter the customer's details and pick the account type. The customer can only sign in online after a manager creates their login under Customer logins, using the customer id.",
      ],
    },
    {
      id: "staff-branch",
      category: "For staff",
      question: "Why does a deposit ask for a branch or ATM id?",
      answer: [
        "Every transaction records the employee and the branch or ATM that handled it. It defaults to your own branch. Area managers have no home branch, so they must name one.",
      ],
    },

    // ---- Troubleshooting ----
    {
      id: "cannot-reach-service",
      category: "Troubleshooting",
      question: "It says it can't reach the banking service",
      answer: [
        "The service may be down, or you may have reached the daily request limit (1,000 requests per customer per day by default). Wait a little and try again.",
      ],
    },
    {
      id: "no-access",
      category: "Troubleshooting",
      question: "It says I don't have access to something",
      answer: ["Customers can only reach their own accounts, and staff actions depend on the employee's role. If you need more access, ask a bank manager."],
    },
    {
      id: "contact-support",
      category: "Troubleshooting",
      question: "How do I contact support?",
      answer: [
        supportEmail
          ? `Email ${supportEmail} and include your username.`
          : "Contact your branch and include your username.",
        "We will never ask for your password or security answers. Don't share them with anyone.",
      ],
      ...(supportEmail ? { links: [{ href: `mailto:${supportEmail}`, label: `Email ${supportEmail}` }] } : {}),
    },
  ];
}
