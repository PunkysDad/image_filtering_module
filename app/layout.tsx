import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "picmagIQ",
  description: "Professional image filters for your content",
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
