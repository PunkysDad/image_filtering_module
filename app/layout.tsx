import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Filter Platform",
  description: "POC for a CMS-agnostic image filter SaaS dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-900 text-ink-100 antialiased">
        {children}
      </body>
    </html>
  );
}
