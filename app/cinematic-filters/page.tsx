import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Cinematic Image Filters Online — Film Stock Color Grades | picmagIQ",
  description:
    "Apply real film stock color grades to your images online. Kodak 2383, Bleach Bypass, Fuji 3510, and more — exported as production-ready WebP for any CMS. No Photoshop required.",
  openGraph: {
    title: "Cinematic Image Filters Online — Film Stock Color Grades | picmagIQ",
    description:
      "Apply real film stock color grades to your images online. Kodak 2383, Bleach Bypass, Fuji 3510, and more — exported as production-ready WebP for any CMS. No Photoshop required.",
    url: "https://picmagiq.com/cinematic-filters",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Cinematic Image Filters Online",
  description:
    "Apply real film stock color grades to your images online. Kodak 2383, Bleach Bypass, Fuji 3510, and more — exported as production-ready WebP for any CMS. No Photoshop required.",
  url: "https://picmagiq.com/cinematic-filters",
};

const presets = [
  {
    name: "Kodak 2383",
    body: "Warm print film. The color science that printed Inception and The Dark Knight. Rich blacks, neutral highlights, natural toe and shoulder curve.",
  },
  {
    name: "Bleach Bypass",
    body: "Retained silver grain over color dyes. Deep blacks, crushed contrast, desaturated mids. The process behind Se7en and Saving Private Ryan.",
  },
  {
    name: "Fuji 3510",
    body: "Fujifilm's Super F-CP print stock. Cooler mids, soft highlights, luminous shadows. Arthouse and international cinema's alternative to Kodak.",
  },
  {
    name: "Teal Orange Pro",
    body: "Maximum perceptual contrast between skin tones and environments. The signature grade of blockbuster cinema in the 2000s and 2010s.",
  },
  {
    name: "Cool Fade",
    body: "Flat editorial. Lifted blacks, cool cast. Overexposed negative aesthetic favored in fashion and editorial photography.",
  },
  {
    name: "Warm Print",
    body: "Amber warmth across all tones. References the color drift of incandescent theatrical projection and aged prints.",
  },
];

export default function CinematicFiltersPage() {
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
            Cinematic Filters
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Cinematic color grades rooted in real film history
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Every cinematic filter in picmagIQ is derived from the color science of actual film
            stocks used in Hollywood cinema — not invented looks, not AI-generated approximations.
            Upload your image, apply a grade, export a production-ready WebP.
          </p>
        </div>
      </section>

      {/* What makes a cinematic filter */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Film stock color science, not presets.
            </h2>
            <p className="text-ink-200 leading-relaxed">
              A true cinematic filter maps input colors to output colors the way a physical film
              stock would respond — compressing highlights at the shoulder, lifting shadows at the
              toe, and shifting color in the midtones. This is what separates a film look from a
              simple Instagram filter.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Baked into your exported file.</h2>
            <p className="text-ink-200 leading-relaxed">
              picmagIQ renders your filter server-side using WebGL shaders and exports a finished
              WebP file. The color grade is permanent and pixel-perfect — no JavaScript embed, no
              fragile CSS filter. Drop the file into any CMS and the look is there.
            </p>
          </div>
        </div>
      </section>

      {/* Preset grid */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">The cinematic preset library</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {presets.map((preset) => (
              <div
                key={preset.name}
                className="bg-ink-800 border border-ink-700 rounded-lg p-6 flex flex-col"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-white font-bold text-lg">{preset.name}</h3>
                  <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                </div>
                <p className="text-ink-200 leading-relaxed text-sm">{preset.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Built for marketing and content teams
          </h2>
          <p className="text-ink-200 leading-relaxed">
            picmagIQ is not a photography tool. It&apos;s a production tool for the people who
            publish content to websites. If you manage images for a WordPress blog, a Webflow
            marketing site, a Shopify storefront, or a Squarespace portfolio, picmagIQ gives your
            imagery a consistent, professional cinematic look — without a designer, without
            Photoshop, without a developer ticket.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Apply a cinematic grade to your next image
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
