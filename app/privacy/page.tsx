import { connection } from "next/server";
import LegalDocument from "@/components/LegalDocument";
import { privacyDoc } from "@/lib/legal";

export const metadata = { title: "Privacy Policy · Brite Banking" };

export default async function Page() {
  // The text quotes live configuration (entity, contact, session and lockout lengths), so render per request.
  await connection();
  return <LegalDocument doc={privacyDoc()} otherDoc={{ href: "/terms", label: "Terms of Use" }} />;
}
