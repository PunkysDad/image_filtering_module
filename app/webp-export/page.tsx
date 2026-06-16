import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Export Images as WebP Online — Cinematic Filters + WebP in One Step | picmagIQ",
  description:
    "Apply professional cinematic color grades and export production-ready WebP files in a single workflow. No converter needed. picmagIQ bakes the filter and outputs a web-optimized WebP — ready to upload to any CMS.",
  openGraph: {
    title: "Export Images as WebP Online — Cinematic Filters + WebP in One Step | picmagIQ",
    description:
      "Apply professional cinematic color grades and export production-ready WebP files in a single workflow. No converter needed. picmagIQ bakes the filter and outputs a web-optimized WebP — ready to upload to any CMS.",
    url: "https://picmagiq.com/webp-export",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Export Images as WebP Online",
  description:
    "Apply professional cinematic color grades and export production-ready WebP files in a single workflow. No converter needed. picmagIQ bakes the filter and outputs a web-optimized WebP — ready to upload to any CMS.",
  url: "https://picmagiq.com/webp-export",
};

const steps = [
  "Upload your source image — JPEG, PNG, or WebP accepted",
  "Apply a cinematic filter and fine-tune to taste — up to 5 filter layers, HSL editor, curves",
  "Export as WebP — server-side rendering via WebGL, Sharp conversion, immediate download",
];

const platforms = [
  "WordPress",
  "Webflow",
  "Squarespace",
  "Shopify",
  "HubSpot",
  "Contentful",
  "Sanity",
  "Ghost",
];

export default function WebpExportPage() {
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
            WebP Export
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Cinematic color grade. WebP export. One step.
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Most workflows require two steps — edit the image in one tool, then convert it to WebP
            in another. picmagIQ does both at once. Apply a professional film look, click export,
            and receive a finished, web-optimized WebP file ready to drop into any CMS.
          </p>
        </div>
      </section>

      {/* Why WebP */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Why WebP is the right format for your website images
          </h2>
          <p className="text-ink-200 leading-relaxed mb-5">
            WebP is a modern image format developed by Google that delivers significantly smaller
            file sizes than JPEG and PNG at equivalent visual quality. A typical JPEG at 200KB
            becomes a WebP at around 120KB — a 40% reduction in file weight that directly improves
            your page load time, your Core Web Vitals score, and your search engine ranking.
          </p>
          <p className="text-ink-200 leading-relaxed mb-5">
            As of 2026, WebP is supported by over 97% of web browsers worldwide, including Chrome,
            Firefox, Edge, and Safari. It is the recommended output format for web images on
            WordPress, Webflow, Shopify, and virtually every other CMS platform. There is no longer
            any reason to publish JPEGs or PNGs for web use.
          </p>
          <p className="text-ink-200 leading-relaxed">
            The problem with most WebP converters is that they are just converters — they take your
            existing image and re-encode it in WebP format, preserving whatever JPEG looked like
            before. picmagIQ inverts this. You apply a professional cinematic color grade first,
            then export the graded image as WebP. The filter is baked in. The file is web-ready. No
            second tool required.
          </p>
        </div>
      </section>

      {/* How picmagIQ exports WebP */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">How picmagIQ exports WebP</h2>
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

      {/* WebP + filter in one */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Filter baked in, not layered on.</h2>
            <p className="text-ink-200 leading-relaxed">
              A CSS filter or JavaScript overlay applies a color effect at render time — which means
              it looks different in every browser, breaks in email clients, and disappears entirely
              when someone downloads the image. picmagIQ&apos;s export pipeline renders the filter
              server-side using WebGL shaders and converts the composited output to WebP using
              Sharp. The color grade is part of the image&apos;s pixel data, not a stylesheet.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Original quality preserved.</h2>
            <p className="text-ink-200 leading-relaxed">
              picmagIQ exports at your original image resolution. There is no quality ceiling, no
              watermark, and no re-compression of the source file before the filter is applied. The
              WebP output reflects your original image dimensions at the highest quality WebP
              compression settings.
            </p>
          </div>
        </div>
      </section>

      {/* CMS compatibility */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-10">
            Works with every CMS that accepts image uploads
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-ink-200 text-lg">
            {platforms.map((platform, i) => (
              <span key={platform} className="flex items-center gap-x-4">
                {i > 0 && <span className="text-ink-500">·</span>}
                {platform}
              </span>
            ))}
          </div>
          <p className="text-ink-300 text-sm mt-8">
            If your CMS has a media library, picmagIQ&apos;s output drops straight in.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Export your first WebP in minutes</h2>
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
