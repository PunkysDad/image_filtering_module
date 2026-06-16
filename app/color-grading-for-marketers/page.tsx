import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Online Color Grading for Marketing Teams — CMS-Ready WebP Export | picmagIQ",
  description:
    "Professional color grading for marketing and content managers. Apply cinematic grades to your website images and export production-ready WebP files that drop straight into WordPress, Webflow, Shopify, or any CMS.",
  openGraph: {
    title: "Online Color Grading for Marketing Teams — CMS-Ready WebP Export | picmagIQ",
    description:
      "Professional color grading for marketing and content managers. Apply cinematic grades to your website images and export production-ready WebP files that drop straight into WordPress, Webflow, Shopify, or any CMS.",
    url: "https://picmagiq.com/color-grading-for-marketers",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Online Color Grading for Marketing Teams",
  description:
    "Professional color grading for marketing and content managers. Apply cinematic grades to your website images and export production-ready WebP files that drop straight into WordPress, Webflow, Shopify, or any CMS.",
  url: "https://picmagiq.com/color-grading-for-marketers",
};

const platforms = [
  "WordPress",
  "Webflow",
  "Squarespace",
  "Shopify",
  "HubSpot",
  "Contentful",
  "Sanity",
  "Ghost",
  "Any CMS",
];

const useCases = [
  {
    title: "Hero image consistency",
    body: "Apply the same color grade to every hero image across a site for a unified visual identity.",
  },
  {
    title: "Campaign visuals",
    body: "Match the color treatment of campaign images to a seasonal or brand look without involving a designer.",
  },
  {
    title: "Blog and editorial headers",
    body: "Give editorial content a cinematic, editorial feel that stands out from stock photography.",
  },
  {
    title: "Product photography",
    body: "Add warmth, film texture, or a distinctive grade to product images without a photo studio.",
  },
];

const steps = [
  "Upload your image",
  "Choose a color grade and fine-tune",
  "Export as WebP and upload to your CMS",
];

export default function ColorGradingForMarketersPage() {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNav />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-5">
            Color Grading
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Color grading for your CMS, not your camera roll
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            picmagIQ brings professional color grading to marketing and content teams. Apply
            cinematic grades to your website images — hero images, blog headers, product shots,
            campaign visuals — and export finished WebP files that drop straight into any CMS. No
            Photoshop. No developer ticket. No fragile JavaScript embed.
          </p>
        </div>
      </section>

      {/* The CMS problem */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Why most color grading tools don&apos;t work for marketing teams
          </h2>
          <p className="text-ink-200 leading-relaxed">
            Professional color grading tools are built for photographers and filmmakers — people
            who work in Lightroom, DaVinci Resolve, or Capture One. The output is a raw file or a
            high-resolution JPEG for print. None of that fits a content manager&apos;s workflow. You
            need a finished WebP, sized and optimized for the web, that looks exactly the same in
            preview as it does when published. picmagIQ is built for that workflow.
          </p>
        </div>
      </section>

      {/* Platform callout */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-10">Works with every CMS</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-ink-200 text-lg">
            {platforms.map((platform, i) => (
              <span key={platform} className="flex items-center gap-x-4">
                {i > 0 && <span className="text-ink-500">·</span>}
                {platform}
              </span>
            ))}
          </div>
          <p className="text-ink-300 text-sm mt-8">
            If your CMS accepts an image file upload, picmagIQ works with it.
          </p>
        </div>
      </section>

      {/* Feature list */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">
            What marketing teams use picmagIQ for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase) => (
              <div key={useCase.title}>
                <h3 className="text-white font-bold text-lg mb-3">{useCase.title}</h3>
                <p className="text-ink-200 leading-relaxed">{useCase.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-500/10 text-accent-400 font-bold text-lg mb-4">
                  {i + 1}
                </span>
                <p className="text-ink-200 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Start color grading your marketing images
          </h2>
          <Link
            href="/editor"
            className="inline-block bg-accent-500 hover:bg-accent-400 text-white font-semibold px-8 py-3 rounded text-base transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-700 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold text-lg tracking-tight">picmagIQ</span>
          <p className="text-ink-300 text-sm">
            © 2025{" "}
            <a
              href="https://www.stadiumclubsoftware.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-200 transition-colors underline underline-offset-2"
            >
              Stadium Club Software
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
