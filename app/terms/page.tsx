import { connection } from "next/server";
import LegalDocument from "@/components/LegalDocument";
import { termsDoc } from "@/lib/legal";

export const metadata = { title: "Terms of Use · Brite Banking" };

export default async function Page() {
  // The text quotes live configuration (entity, contact, session and lockout lengths), so render per request.
  await connection();
  return <LegalDocument doc={termsDoc()} otherDoc={{ href: "/privacy", label: "Privacy Policy" }} />;
}
