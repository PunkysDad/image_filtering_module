import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Add Film Grain to Photos Online — Luma-Coupled Grain Effect | picmagIQ",
  description:
    "Add authentic luma-coupled film grain to your photos online. picmagIQ's grain engine responds to the luminance of your image — darker areas get more grain, just like real film. Export as WebP.",
  openGraph: {
    title: "Add Film Grain to Photos Online — Luma-Coupled Grain Effect | picmagIQ",
    description:
      "Add authentic luma-coupled film grain to your photos online. picmagIQ's grain engine responds to the luminance of your image — darker areas get more grain, just like real film. Export as WebP.",
    url: "https://picmagiq.com/film-grain",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Add Film Grain to Photos Online",
  description:
    "Add authentic luma-coupled film grain to your photos online. picmagIQ's grain engine responds to the luminance of your image — darker areas get more grain, just like real film. Export as WebP.",
  url: "https://picmagiq.com/film-grain",
};

const grainPresets = [
  {
    name: "Film Grain preset",
    body: "Luma-coupled grain, halation glow on highlights, subtle vignette. The foundational analog film look.",
  },
  {
    name: "Cinematic preset",
    body: "Fine grain layered into a full teal-orange color grade with anamorphic highlight streaks and soft letterbox.",
  },
  {
    name: "Matte Fade preset",
    body: "Grain combined with lifted blacks, gate scratches, and a light leak. Aged archival film aesthetic.",
  },
  {
    name: "High Contrast B&W preset",
    body: "S-curve contrast with grain weighted toward the shadows. Classic black and white photojournalism look.",
  },
];

export default function FilmGrainPage() {
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
            Film Grain
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Film grain that behaves like real film
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Most grain tools add a flat noise overlay. picmagIQ&apos;s grain engine is luma-coupled
            — shadows receive more grain than highlights, the way silver halide crystals actually
            behaved on physical film. The result looks like it was shot on film, not filtered in
            software.
          </p>
        </div>
      </section>

      {/* What is luma-coupled grain */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Why luma-coupling matters</h2>
          <p className="text-ink-200 leading-relaxed">
            On a real roll of film, grain density is not uniform across the image. The shadow areas
            — where less light struck the film — show more visible grain structure. Highlights and
            bright areas show finer, less visible grain. This non-uniform distribution is what gives
            analog film its organic, tactile quality. Flat digital noise overlays look artificial
            because they ignore luminance entirely — every part of the image gets the same texture
            regardless of brightness. picmagIQ&apos;s grain engine samples each pixel&apos;s
            luminance value and scales grain intensity accordingly, producing a result that reads as
            natural rather than processed.
          </p>
        </div>
      </section>

      {/* Grain preset list */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">Grain presets</h2>
          <div className="space-y-10">
            {grainPresets.map((preset) => (
              <div key={preset.name} className="border-l-2 border-accent-500/40 pl-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-white font-bold text-lg">{preset.name}</h3>
                  <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                </div>
                <p className="text-ink-200 leading-relaxed">{preset.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CMS workflow */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Grain baked into your WebP.</h2>
            <p className="text-ink-200 leading-relaxed">
              When you export from picmagIQ, the grain effect is rendered server-side and baked
              permanently into the exported file. There&apos;s no client-side JavaScript, no CSS
              filter. The grain is part of the image itself — which means it looks identical in
              every browser, every CMS, every device.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Works with any CMS.</h2>
            <p className="text-ink-200 leading-relaxed">
              Drop the exported WebP into WordPress, Webflow, Squarespace, Shopify, or any other CMS
              exactly as you would any other image asset. No plugin, no embed code, no developer
              involvement after the initial upload.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Add film grain to your next image</h2>
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
