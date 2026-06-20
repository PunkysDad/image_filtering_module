import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "picmagIQ",
  description: "Professional image filters for your content",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "picmagIQ",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: "https://picmagiq.com",
  offers: [
    {
      "@type": "Offer",
      name: "Basic",
      price: "19.99",
      priceCurrency: "USD",
      billingIncrement: "monthly",
    },
    {
      "@type": "Offer",
      name: "Premium",
      price: "29.99",
      priceCurrency: "USD",
      billingIncrement: "monthly",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-ink-900 text-ink-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <GoogleAnalytics gaId="G-KQLMXH137L" />
      </body>
    </html>
  );
}
