import type { Metadata } from "next";
import Link from "next/link";
import AuthProvider from "@/components/AuthProvider";
import NavBar from "@/components/NavBar";
import SessionTimeout from "@/components/SessionTimeout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brite Banking Portal",
  description: "Customer banking portal",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply a saved theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <NavBar />
          <SessionTimeout />
          <main>{children}</main>
          <footer className="site-footer">
            <nav aria-label="Legal and help">
              <Link href="/terms" className="tap">
                Terms
              </Link>
              <Link href="/privacy" className="tap">
                Privacy
              </Link>
              <Link href="/help" className="tap">
                Help
              </Link>
            </nav>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
