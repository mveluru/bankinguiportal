import { connection } from "next/server";
import HelpCenter from "@/components/HelpCenter";
import { FAQ_CATEGORIES, buildFaqs } from "@/lib/faq";

export const metadata = { title: "Help & FAQ · Brite Banking" };

export default async function HelpPage() {
  // Answers quote live configuration (lockout, session lengths, ...), so render per request, not at build time.
  await connection();
  return <HelpCenter faqs={buildFaqs(process.env.SUPPORT_EMAIL?.trim() || undefined)} categories={[...FAQ_CATEGORIES]} />;
}
