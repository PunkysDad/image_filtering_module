import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title:
    "How to Give Your WordPress Site a Cinematic Look Without Photoshop | picmagIQ Blog",
  description:
    "A step-by-step guide for WordPress content managers who want cinematic color grades on their site images — no Photoshop, no plugins, no developer required.",
  openGraph: {
    title:
      "How to Give Your WordPress Site a Cinematic Look Without Photoshop | picmagIQ Blog",
    description:
      "A step-by-step guide for WordPress content managers who want cinematic color grades on their site images — no Photoshop, no plugins, no developer required.",
    url: "https://picmagiq.com/blog/cinematic-wordpress-images",
    siteName: "picmagIQ",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Give Your WordPress Site a Cinematic Look Without Photoshop",
  description:
    "A step-by-step guide for WordPress content managers who want cinematic color grades on their site images — no Photoshop, no plugins, no developer required.",
  url: "https://picmagiq.com/blog/cinematic-wordpress-images",
  publisher: {
    "@type": "Organization",
    name: "picmagIQ",
    url: "https://picmagiq.com",
  },
  datePublished: "2026-06-16",
};

export default function CinematicWordpressImagesPage() {
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
            CMS Workflow
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            How to Give Your WordPress Site a Cinematic Look Without Photoshop
          </h1>
          <p className="text-ink-300 text-sm">5 min read · June 16, 2026</p>
        </div>
      </section>

      {/* Article body */}
      <article className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-ink-200 text-lg leading-relaxed mb-6">
            If you manage content on a WordPress site, you already know the image problem. Stock
            photos look like stock photos. Your own photos look flat. Everything has that same
            clean, slightly sterile digital look that makes pages feel generic. A professional
            cinematic color grade would fix this — but Photoshop costs $55/month, takes months to
            learn, and is overkill for a content manager who just needs images to look great before
            uploading them to the media library.
          </p>
          <p className="text-ink-200 text-lg leading-relaxed mb-12">There is a simpler way.</p>

          <h2 className="text-2xl font-bold text-white mb-5">What is a cinematic color grade?</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            A color grade is a deliberate shift applied to the tones, colors, and contrast of an
            image to create a specific visual mood. In cinema, colorists spend days grading every
            shot to a precise look — warm shadows, compressed highlights, a slight color cast in the
            mids. The result is images that feel intentional rather than accidental. For marketing
            purposes, a consistent color grade across your site&apos;s images creates visual
            coherence — the same way a brand&apos;s color palette creates coherence in its design
            system.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Why WordPress doesn&apos;t solve this natively
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            WordPress&apos;s built-in image editor handles basic tasks — cropping, rotating, scaling
            — but has no color grading capability. CSS filters (<code className="text-accent-400">filter: sepia()</code>{" "}
            or <code className="text-accent-400">filter: saturate()</code>) exist, but they apply at
            render time in the browser, meaning the look changes slightly across devices, disappears
            when images are downloaded, and adds CSS complexity to your theme. The right approach is
            to bake the grade into the image file before it ever enters WordPress — so the image
            looks exactly the same in the media library, on the page, in Google&apos;s image index,
            and when downloaded.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            The picmagIQ workflow for WordPress
          </h2>
          <ol className="space-y-4 mb-12">
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Step 1 — Upload your image to picmagIQ.</span>{" "}
              Supported formats: JPEG, PNG, WebP. No account required to preview.
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Step 2 — Choose a cinematic preset.</span>{" "}
              For WordPress content, the Kodak 2383 preset is a strong default — warm, natural, wide
              dynamic range. For editorial or longform content, Bleach Bypass adds contrast and
              desaturation that gives headers a journalistic weight.
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">
                Step 3 — Fine-tune with the HSL editor and curves.
              </span>{" "}
              Adjust global hue, saturation, and luminance, or use the curves editor for precise
              tonal control.
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Step 4 — Export as WebP.</span> picmagIQ
              renders server-side and outputs a WebP file at your original resolution. No watermark.
              No quality loss.
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Step 5 — Upload to WordPress.</span> Drag
              the WebP into your media library exactly as you would any other image. WordPress has
              supported WebP uploads natively since version 5.8.
            </li>
          </ol>

          <h2 className="text-2xl font-bold text-white mb-5">
            Which preset works best for WordPress content?
          </h2>
          <ul className="space-y-3 mb-12 list-disc pl-5">
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Blog headers and editorial content:</span>{" "}
              Bleach Bypass or High Contrast B&amp;W — high contrast, strong visual hierarchy
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Product and feature images:</span> Kodak
              2383 or Warm Print — natural warmth, broad appeal
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Campaign and hero images:</span> Teal
              Orange Pro or Cinematic — bold, high-impact, contemporary blockbuster aesthetic
            </li>
            <li className="text-ink-200 leading-relaxed">
              <span className="font-semibold text-white">Portfolio and case study imagery:</span>{" "}
              Cool Fade or Fuji 3510 — restrained, editorial, professional
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white mb-5">The result</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            A WordPress site with consistently color-graded images reads as intentional. Visitors
            may not consciously notice the grade — but they notice the coherence. Every image feels
            like it belongs. That is the difference between a site that looks assembled and a site
            that looks designed.
          </p>

          {/* CTA box */}
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Try it on your next WordPress image
            </h2>
            <p className="text-ink-200 leading-relaxed mb-6 max-w-xl mx-auto">
              Upload any image to picmagIQ and apply a cinematic preset in under two minutes. Export
              as WebP, drop into WordPress.
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
