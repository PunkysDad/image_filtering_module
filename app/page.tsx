import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "picmagIQ — Professional Image Filters for Marketers",
  description:
    "Apply cinematic film looks, color grades, and creative effects to your images. Export production-ready WebP files — no Photoshop, no developer required.",
  openGraph: {
    title: "picmagIQ — Professional Image Filters for Marketers",
    description:
      "Apply cinematic film looks, color grades, and creative effects to your images. Export production-ready WebP files — no Photoshop, no developer required.",
    url: "https://picmagiq.com",
    siteName: "picmagIQ",
    type: "website",
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
      billingIncrement: "P1M",
    },
    {
      "@type": "Offer",
      name: "Premium",
      price: "29.99",
      priceCurrency: "USD",
      billingIncrement: "P1M",
    },
  ],
};

const CANVAS_PRESETS = [
  {
    name: "Film Grain",
    description: "Analog texture, vignette, and muted tones for a classic film look.",
  },
  {
    name: "Cinematic",
    description: "Hollywood teal-orange grade with optional letterbox and bloom.",
  },
  {
    name: "Matte Fade",
    description: "Lifted blacks and a cool cast for a clean editorial feel.",
  },
  {
    name: "High Contrast B&W",
    description: "Deep blacks and punchy contrast rendered in rich monochrome.",
  },
  {
    name: "Soft Glow",
    description: "Warm bloom over highlights for a dreamy, luminous quality.",
  },
  {
    name: "Duotone",
    description: "Two-color gradient ramp mapped from shadows to highlights.",
  },
  {
    name: "Studio Lighting",
    description: "Directional soft spotlight that sculpts depth into your subject.",
  },
];

const PREMIUM_PRESETS = [
  {
    name: "Kodak 2383",
    description: "Emulates the warmth and natural rolloff of classic Kodak print film.",
  },
  {
    name: "Bleach Bypass",
    description: "Desaturated, high-contrast look inspired by the darkroom technique.",
  },
  {
    name: "Split Tone Pro",
    description: "Hue-aware shadow and highlight color grading with five selectable color pairs.",
  },
  {
    name: "Fuji 3510",
    description: "Cool greens and a gentle, soft highlight rolloff from Fuji stock.",
  },
  {
    name: "Cool Fade",
    description: "Matte editorial style with a cool, understated color cast.",
  },
  {
    name: "Warm Print",
    description: "Rich warm midtones and lifted shadows for a printed-photo feel.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNav />

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6">
            Professional image filters,
            <br className="hidden sm:block" />
            baked right into your exports.
          </h1>
          <p className="text-ink-200 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            picmagIQ gives marketing and content teams cinematic color grades with one click —
            then exports production-ready WebP files that drop into any CMS. No Photoshop. No
            developer ticket. No friction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/editor"
              className="bg-accent-500 hover:bg-accent-400 text-white font-semibold px-8 py-3 rounded text-base transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/editor"
              className="border border-ink-500 text-ink-100 hover:border-ink-300 hover:text-white font-semibold px-8 py-3 rounded text-base transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Showcase */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
            13 hand-crafted presets
          </h2>
          <p className="text-ink-300 text-center mb-14 max-w-xl mx-auto">
            Every look is fully adjustable — dial in intensity, stack up to five layers, and
            fine-tune individual colors with a global HSL panel.
          </p>

          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-5 px-1">
              Included in all plans
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CANVAS_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className="bg-ink-700 border border-ink-600 rounded-lg p-5 hover:border-ink-400 transition-colors"
                >
                  <div className="text-white font-semibold mb-2">{preset.name}</div>
                  <div className="text-ink-300 text-sm leading-snug">{preset.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-5 px-1">
              Premium — LUT / WebGL
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PREMIUM_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className="bg-ink-700 border border-accent-500/30 rounded-lg p-5 hover:border-accent-500/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{preset.name}</span>
                    <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                      Premium
                    </span>
                  </div>
                  <div className="text-ink-300 text-sm leading-snug">{preset.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-14">
            From upload to export in three steps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Upload your image",
                body: "Drop in any JPEG or PNG. Your file stays in the browser — nothing is sent to a server.",
              },
              {
                step: "02",
                title: "Choose a filter and fine-tune",
                body: "Pick a preset, stack up to five layers, and adjust every parameter until the look is exactly right.",
              },
              {
                step: "03",
                title: "Export as WebP",
                body: "Download a production-ready WebP with the grade baked in. Paste it straight into Contentful, WordPress, or wherever your content lives.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex flex-col">
                <div className="text-4xl sm:text-5xl font-black text-ink-300 mb-4 tabular-nums">{step}</div>
                <div className="text-white font-semibold text-lg mb-2">{title}</div>
                <div className="text-ink-300 text-sm leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Film History Teaser */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Premium presets rooted in real film history
          </h2>
          <p className="text-ink-300 leading-relaxed mb-6">
            The LUT presets in picmagIQ aren&apos;t invented looks — they&apos;re derived from the
            color science of real film stocks and darkroom processes used in Hollywood cinema. Kodak
            2383 printed <em>Inception</em> and <em>The Dark Knight</em>. Bleach bypass gave{" "}
            <em>Seven</em> its gritty silver look.
          </p>
          <Link
            href="/luts"
            className="text-accent-500 hover:text-accent-400 transition-colors font-medium"
          >
            Read the full film stock history →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-14">
            Simple, transparent pricing
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Basic */}
            <div className="bg-ink-700 border border-ink-600 rounded-xl p-8 flex flex-col">
              <div className="text-white font-bold text-xl mb-1">Basic</div>
              <div className="text-ink-300 text-sm mb-6">Everything you need to get started</div>
              <div className="text-white text-4xl font-black mb-0">
                $19.99
                <span className="text-ink-300 text-base font-normal">/mo</span>
              </div>
              <div className="my-6 border-t border-ink-600" />
              <ul className="space-y-3 text-sm text-ink-200 flex-1 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>All 7 Canvas 2D presets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>WebP export with baked-in grade</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>Filter layer stack — up to 5 stacked filter layers</span>
                </li>
              </ul>
              <Link
                href="/editor"
                className="text-center bg-ink-600 hover:bg-ink-500 text-white font-semibold py-3 rounded transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-ink-700 border border-accent-500/50 rounded-xl p-8 flex flex-col relative">
              <div className="absolute -top-3 right-6 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div className="text-white font-bold text-xl mb-1">Premium</div>
              <div className="text-ink-300 text-sm mb-6">
                Professional-grade tools for serious creators
              </div>
              <div className="text-white text-4xl font-black mb-0">
                $29.99
                <span className="text-ink-300 text-base font-normal">/mo</span>
              </div>
              <div className="my-6 border-t border-ink-600" />
              <ul className="space-y-3 text-sm text-ink-200 flex-1 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>Everything in Basic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>
                    All 6 LUT / WebGL presets — Kodak 2383, Bleach Bypass, Split Tone Pro, and
                    more
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 shrink-0">✓</span>
                  <span>AI Tutor — contextual guidance on every control</span>
                </li>
              </ul>
              <Link
                href="/editor"
                className="text-center bg-accent-500 hover:bg-accent-400 text-white font-semibold py-3 rounded transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
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
