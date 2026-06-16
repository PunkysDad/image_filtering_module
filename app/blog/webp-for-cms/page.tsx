import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Why WebP Is the Right Image Format for Your CMS in 2026 | picmagIQ Blog",
  description:
    "JPEG and PNG are legacy formats. WebP delivers 25–40% smaller file sizes with no visible quality loss — and that means faster load times, better Core Web Vitals, and higher search rankings.",
  openGraph: {
    title: "Why WebP Is the Right Image Format for Your CMS in 2026 | picmagIQ Blog",
    description:
      "JPEG and PNG are legacy formats. WebP delivers 25–40% smaller file sizes with no visible quality loss — and that means faster load times, better Core Web Vitals, and higher search rankings.",
    url: "https://picmagiq.com/blog/webp-for-cms",
    siteName: "picmagIQ",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Why WebP Is the Right Image Format for Your CMS in 2026",
  description:
    "JPEG and PNG are legacy formats. WebP delivers 25–40% smaller file sizes with no visible quality loss — and that means faster load times, better Core Web Vitals, and higher search rankings.",
  url: "https://picmagiq.com/blog/webp-for-cms",
  publisher: {
    "@type": "Organization",
    name: "picmagIQ",
    url: "https://picmagiq.com",
  },
  datePublished: "2026-06-16",
};

export default function WebpForCmsPage() {
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
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-5">
            Web Performance
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Why WebP Is the Right Image Format for Your CMS in 2026
          </h1>
          <p className="text-ink-300 text-sm">4 min read · June 16, 2026</p>
        </div>
      </section>

      {/* Article body */}
      <article className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-ink-200 text-lg leading-relaxed mb-12">
            If you are still uploading JPEGs and PNGs to your CMS, you are publishing images in
            formats that were designed for the web of the 1990s. JPEG was standardized in 1992. PNG
            followed in 1996. Both were designed at a time when broadband internet did not exist and
            mobile devices were not a consideration. In 2026, there is a better option that every
            major CMS platform supports: WebP.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            What WebP is and where it came from
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            WebP is a modern image format developed by Google and released in 2010. It uses more
            sophisticated compression algorithms than JPEG and PNG, delivering significantly smaller
            file sizes at equivalent visual quality. A JPEG image at 200KB typically becomes a WebP
            at around 120-140KB — a reduction of 30-40% with no perceptible difference in quality.
            WebP also supports transparency (like PNG) and animation (like GIF), making it a single
            format that covers most web image use cases.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">What this means for your CMS</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            File size translates directly to page load time. Page load time translates directly to
            user experience and search engine ranking. Google&apos;s Core Web Vitals — the metrics
            that directly affect your site&apos;s ranking — include Largest Contentful Paint (LCP),
            which measures how quickly the largest visible element on a page loads. For most content
            pages, that element is a hero image. Publishing that hero image as a WebP instead of a
            JPEG can improve your LCP by 200-400 milliseconds — a meaningful difference in
            Google&apos;s scoring. For a CMS-driven marketing site with dozens of image-heavy pages,
            switching to WebP across all images compounds that improvement site-wide.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">CMS support in 2026</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            WebP is now natively supported by every major CMS and is the recommended format across
            the board. WordPress has supported WebP uploads since version 5.8. Webflow accepts WebP
            natively and recommends it for all web images. Squarespace converts uploaded images to
            WebP automatically. Shopify serves WebP to supported browsers automatically. If your CMS
            is on this list — and virtually every modern CMS is — you can start uploading WebP files
            today with no configuration required.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">The picmagIQ advantage</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Most tools that export WebP are converters — they take a JPEG, re-encode it as WebP, and
            deliver a smaller file with the same flat digital look. picmagIQ combines color grading
            and WebP export into a single workflow. You apply a cinematic film look, export as WebP,
            and receive a finished file that is both visually graded and web-optimized. One tool,
            one step, one file ready for your media library.
          </p>

          {/* CTA box */}
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Export your next image as WebP</h2>
            <p className="text-ink-200 leading-relaxed mb-6 max-w-xl mx-auto">
              picmagIQ applies a professional color grade and exports a production-ready WebP file
              in a single step. No converter required.
            </p>
            <Link
              href="/editor"
              className="inline-block bg-accent-500 hover:bg-accent-400 text-white font-semibold px-8 py-3 rounded text-base transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-12">
            <Link
              href="/blog"
              className="text-ink-300 hover:text-white text-sm transition-colors"
            >
              ← Back to Blog
            </Link>
          </div>
        </div>
      </article>

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
