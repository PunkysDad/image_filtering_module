import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Knockout Text Online — Show Images Through Your Type | picmagIQ",
  description:
    "Create knockout text online — punch headlines through an overlay image to reveal the photo beneath the letterforms. Control font, size, weight, spacing, and position, then export branded hero images as WebP for any CMS.",
  openGraph: {
    title: "Knockout Text Online — Show Images Through Your Type | picmagIQ",
    description:
      "Create knockout text online — punch headlines through an overlay image to reveal the photo beneath the letterforms. Control font, size, weight, spacing, and position, then export branded hero images as WebP for any CMS.",
    url: "https://picmagiq.com/knockout-text",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Knockout Text Online — Show Images Through Your Type",
  description:
    "Create knockout text online — punch headlines through an overlay image to reveal the photo beneath the letterforms. Control font, size, weight, spacing, and position, then export branded hero images as WebP for any CMS.",
  url: "https://picmagiq.com/knockout-text",
};

const controls = [
  {
    name: "Text",
    body: "Type the word or phrase you want to cut through the overlay. Short, bold headlines read best — a brand name, a campaign word, a single statement.",
  },
  {
    name: "Font size",
    body: "Scale the type up until the letterforms are large enough to reveal a meaningful slice of the image beneath them. Bigger type shows more of the photo.",
  },
  {
    name: "Font weight",
    body: "Choose regular, bold, or heavy. Heavier weights open up wider letterforms, which show more of the underlying image — the heaviest weight is the strongest knockout effect.",
  },
  {
    name: "Letter spacing",
    body: "Open or tighten the space between characters to balance how much overlay sits between letters and how the image reads across the word.",
  },
  {
    name: "Horizontal & vertical position",
    body: "Slide the text anywhere on the canvas to line the letterforms up with the part of the image you want showing through.",
  },
];

export default function KnockoutTextPage() {
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
            Knockout Text
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Headlines that show the image through the type
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Knockout text punches your headline straight through an overlay image, revealing the
            photo beneath the letterforms. It&apos;s the bold, typographic hero treatment you see on
            campaign banners and landing pages — and in picmagIQ you can build it in the browser and
            export it as a WebP ready for any CMS.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">How the knockout works</h2>
          <p className="text-ink-200 leading-relaxed mb-5">
            You start with a base image and lay an overlay image on top of it. Knockout text then
            cuts your headline out of that overlay — wherever a letter sits, the overlay is erased
            and the base image shows through. The type itself becomes a window onto the photo
            underneath.
          </p>
          <p className="text-ink-200 leading-relaxed">
            Because the effect is rendered into the pixels and exported as a finished WebP, it
            isn&apos;t a font trick or a CSS blend mode that breaks across browsers. The knockout is
            baked into the image file — it looks identical everywhere you publish it, and it drops
            into any CMS media library like any other image.
          </p>
        </div>
      </section>

      {/* Controls */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">The controls</h2>
          <div className="space-y-10">
            {controls.map((control) => (
              <div key={control.name} className="border-l-2 border-accent-500/40 pl-6">
                <h3 className="text-white font-bold text-lg mb-3">{control.name}</h3>
                <p className="text-ink-200 leading-relaxed">{control.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            For branded hero images and banners
          </h2>
          <p className="text-ink-200 leading-relaxed">
            Knockout text is how marketing teams give a hero image a typographic identity — a brand
            name filled with a product photo, a campaign word revealing a scene, a banner that reads
            as designed rather than dropped in. Combine it with{" "}
            <Link
              href="/compositing"
              className="text-accent-500 hover:text-accent-400 transition-colors"
            >
              compositing
            </Link>{" "}
            to build the underlying image from multiple subjects first, then punch your headline
            through the result — all in the browser, all exported as one WebP.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Build a knockout-text hero image
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
