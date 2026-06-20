import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title:
    "How to Build a Branded Marketing Image with Compositing and Knockout Text | picmagIQ Blog",
  description:
    "A practical walkthrough for marketing teams: combine multiple subjects into one image, color-grade them to match, then punch your headline through the result with knockout text — all in the browser, exported as WebP.",
  openGraph: {
    title:
      "How to Build a Branded Marketing Image with Compositing and Knockout Text | picmagIQ Blog",
    description:
      "A practical walkthrough for marketing teams: combine multiple subjects into one image, color-grade them to match, then punch your headline through the result with knockout text — all in the browser, exported as WebP.",
    url: "https://picmagiq.com/blog/composite-marketing-images",
    siteName: "picmagIQ",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "How to Build a Branded Marketing Image with Compositing and Knockout Text",
  description:
    "A practical walkthrough for marketing teams: combine multiple subjects into one image, color-grade them to match, then punch your headline through the result with knockout text — all in the browser, exported as WebP.",
  url: "https://picmagiq.com/blog/composite-marketing-images",
  publisher: {
    "@type": "Organization",
    name: "picmagIQ",
    url: "https://picmagiq.com",
  },
  datePublished: "2026-06-19",
};

export default function CompositeMarketingImagesPage() {
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
            Design Workflow
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            How to Build a Branded Marketing Image with Compositing and Knockout Text
          </h1>
          <p className="text-ink-300 text-sm">6 min read · June 19, 2026</p>
        </div>
      </section>

      {/* Article body */}
      <article className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-ink-200 text-lg leading-relaxed mb-6">
            Most marketing images aren&apos;t a single photograph. A hero banner often needs two or
            three product shots arranged together. A campaign visual wants your logo or headline
            treated over a scene. A team page needs headshots that were taken in different rooms to
            somehow look like one set. These are jobs that traditionally meant opening Photoshop —
            or filing a ticket with whoever owns the Photoshop license.
          </p>
          <p className="text-ink-200 text-lg leading-relaxed mb-12">
            This walkthrough builds one finished, branded marketing image in the browser using two
            picmagIQ features together:{" "}
            <Link href="/compositing" className="text-accent-500 hover:text-accent-400 transition-colors">
              compositing
            </Link>{" "}
            to assemble the scene, and{" "}
            <Link href="/knockout-text" className="text-accent-500 hover:text-accent-400 transition-colors">
              knockout text
            </Link>{" "}
            to punch a headline through it. No Photoshop, no designer, exported as a CMS-ready WebP.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Step 1 — Gather your subjects
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Decide what belongs in the image before you open the workspace. For a product hero that
            might be a background photo and two or three product shots. For a campaign banner it
            could be a single subject and an overlay texture. You can bring in up to five subjects,
            each from its own source photo — they don&apos;t need to share a background, a
            resolution, or a color treatment, because you&apos;ll fix all of that inside picmagIQ.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Step 2 — Let background removal do the cutting
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Add each subject to the composite and picmagIQ removes its background automatically, in
            the browser — no manual selection or clipping paths. If an automatic cutout leaves a
            stray edge or trims something it shouldn&apos;t have, switch to the brush mask editor and
            refine it by hand: erase and restore brushes, adjustable brush size and hardness, and
            full undo/redo. This is the step that used to eat the most time in a traditional editor,
            and here it&apos;s mostly automatic.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Step 3 — Arrange the composition
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            With your subjects isolated, drag each one into place on the canvas, scaling and
            positioning by eye until the layout reads the way you want. Place the background first,
            then arrange the subjects on top of it. Add a global overlay layer if you want a texture
            or branded frame sitting across the whole scene.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Step 4 — Grade everything to match
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            This is what makes a composite look intentional instead of pasted together. Each subject
            carries its own filter stack, so you can apply the same cinematic{" "}
            <Link
              href="/color-grading-for-marketers"
              className="text-accent-500 hover:text-accent-400 transition-colors"
            >
              color grade
            </Link>{" "}
            to every element — warming the shadows, matching the contrast, unifying the palette —
            so three photos shot under three different lighting conditions finally read as one
            image. Grade the overlay too if you&apos;re using one.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">
            Step 5 — Punch the headline through with knockout text
          </h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Now add the typographic treatment. Knockout text cuts your headline out of the overlay
            image, so the composite shows through the letterforms. Type your word or phrase, then
            tune the font size, weight, letter spacing, and horizontal and vertical position until
            the type lines up with the part of the image you want revealed. Heavier weights and
            larger sizes open up wider letterforms, which show more of the picture beneath — this is
            the bold hero treatment you see on campaign banners and landing pages.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">Step 6 — Export as WebP</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            Export and picmagIQ renders the whole thing server-side into a single finished WebP —
            the cutouts, the layout, the per-subject grading, and the knockout text all baked into
            the pixels. There&apos;s no CSS blend mode to break across browsers and no font that
            needs to load. Drop the file into WordPress, Webflow, Shopify, or any other CMS exactly
            as you would any other image.
          </p>

          <h2 className="text-2xl font-bold text-white mb-5">The result</h2>
          <p className="text-ink-200 leading-relaxed mb-12">
            One branded marketing image — multiple subjects, consistent grading, a typographic
            hero treatment — built start to finish in the browser, by a content manager, without a
            designer or a Photoshop license. That is the workflow picmagIQ is built for.
          </p>

          {/* CTA box */}
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Build your first composite</h2>
            <p className="text-ink-200 leading-relaxed mb-6 max-w-xl mx-auto">
              Combine subjects, grade them to match, and punch a headline through the result — then
              export it as a CMS-ready WebP.
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
