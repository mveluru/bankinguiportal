import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brite Banking Portal",
  description: "Customer banking portal",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            Brite Banking
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/accounts/open">Open an account</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
