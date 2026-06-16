import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "What Is a LUT? A Plain-English Guide for Marketing Teams | picmagIQ Blog",
  description:
    "LUTs are the color science behind Hollywood cinema — now available to anyone publishing images to the web. Here's what a LUT is, where they come from, and why they matter for marketing photography.",
  openGraph: {
    title: "What Is a LUT? A Plain-English Guide for Marketing Teams | picmagIQ Blog",
    description:
      "LUTs are the color science behind Hollywood cinema — now available to anyone publishing images to the web. Here's what a LUT is, where they come from, and why they matter for marketing photography.",
    url: "https://picmagiq.com/blog/what-is-a-lut",
    siteName: "picmagIQ",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What Is a LUT? A Plain-English Guide for Marketing Teams",
  description:
    "LUTs are the color science behind Hollywood cinema — now available to anyone publishing images to the web. Here's what a LUT is, where they come from, and why they matter for marketing photography.",
  url: "https://picmagiq.com/blog/what-is-a-lut",
  publisher: {
    "@type": "Organization",
    name: "picmagIQ",
    url: "https://picmagiq.com",
  },
  datePublished: "2026-06-16",
};

export default function WhatIsALutPage() {
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
            Film &amp; Color
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            What Is a LUT? A Plain-English Guide for Marketing Teams
          </h1>
          <p className="text-ink-300 text-sm">4 min read · June 16, 2026</p>
        </div>
      </section>

      {/* Article body */}
      <article className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-ink-200 text-lg leading-relaxed mb-12">
            If you have spent time in photography or video editing communities, you have probably
            encountered the term LUT. It is used constantly — applied to presets, sold in packs,
            discussed in color grading forums — but rarely explained in plain terms. This guide
            explains what a LUT actually is, where the technology comes from, and why it matters for
            anyone who publishes images to a website.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">The technical definition, simplified</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            LUT stands for Look Up Table. In image processing, a LUT is a file that maps every
            possible input color value to a corresponding output color value. When you apply a LUT
            to an image, every pixel&apos;s color is looked up in the table and replaced with the
            mapped output color. A LUT that darkens shadows and warms highlights will do so
            consistently across every pixel in the image — regardless of the image&apos;s content,
            subject matter, or composition.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">Where LUTs come from</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            The most valuable LUTs are not invented digitally — they are derived from the measured
            physical response of real film stocks. When Kodak&apos;s Vision Color Print Film 2383
            was used in a darkroom, it responded to light in a specific, measurable way: compressing
            bright highlights at the shoulder of its sensitometric curve, lifting dark shadows at
            the toe, and introducing a slight warmth across the midtones. Scientists measured
            exactly how the film transformed input light values into output density values, and
            encoded that transformation as a mathematical table. Applied digitally, that table
            recreates the film&apos;s character on any image — without the darkroom, without the
            film stock, without the chemical process.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Why this matters for marketing photography
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Stock photography has a problem: it all looks like stock photography. The flat,
            evenly-lit, color-neutral look of most stock images is a direct consequence of digital
            sensors rendering color linearly — every stop of light maps to an equal increment of
            brightness. Film didn&apos;t work that way. It compressed, it shifted, it responded to
            light non-linearly, and that non-linearity is what gave analog photography its sense of
            depth and warmth. A LUT restores that non-linearity to digital images. Applied
            consistently across a site&apos;s images, a single LUT creates visual coherence — every
            image shares the same tonal character, the same shadow behavior, the same highlight
            rolloff. For marketing teams, that coherence is the difference between a site that looks
            assembled and a site that looks designed.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">LUTs in picmagIQ</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            picmagIQ&apos;s Premium presets are LUT-based, derived from the color science of real
            film stocks: Kodak 2383, Fujifilm Super F-CP 3510, and several cinematic processing
            techniques including bleach bypass silver retention. Each LUT is rendered server-side
            using WebGL fragment shaders — applied at full precision before the image is converted
            to WebP and delivered for download. The result is a properly graded image, not a
            filtered screenshot.
          </p>

          {/* CTA box */}
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Apply a LUT to your next image</h2>
            <p className="text-ink-200 leading-relaxed mb-6 max-w-xl mx-auto">
              picmagIQ&apos;s Premium plan includes six LUT-based presets derived from real film
              stocks. Upload any image and see the difference.
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
