import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "picmagIQ vs Photoshop for Marketing Teams — The Right Tool for CMS Workflows",
  description:
    "Photoshop is built for photographers and designers. picmagIQ is built for marketing and content managers who need professional image looks exported as WebP and dropped into a CMS. Here's the difference.",
  openGraph: {
    title: "picmagIQ vs Photoshop for Marketing Teams — The Right Tool for CMS Workflows",
    description:
      "Photoshop is built for photographers and designers. picmagIQ is built for marketing and content managers who need professional image looks exported as WebP and dropped into a CMS. Here's the difference.",
    url: "https://picmagiq.com/vs-photoshop",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "picmagIQ vs Photoshop for Marketing Teams",
  description:
    "Photoshop is built for photographers and designers. picmagIQ is built for marketing and content managers who need professional image looks exported as WebP and dropped into a CMS. Here's the difference.",
  url: "https://picmagiq.com/vs-photoshop",
};

const rows = [
  {
    label: "Target user",
    picmagiq: "Marketing & content managers",
    photoshop: "Photographers, designers, VFX artists",
  },
  {
    label: "Learning curve",
    picmagiq: "Under 5 minutes",
    photoshop: "Months to years",
  },
  {
    label: "Monthly cost",
    picmagiq: "From $19.99/mo",
    photoshop: "$55.99/mo (Photography plan)",
  },
  {
    label: "Color grading",
    picmagiq: "Film LUT presets + fine-tune sliders",
    photoshop: "Full manual color grading suite",
  },
  {
    label: "WebP export",
    picmagiq: "Direct, server-side, no plugin",
    photoshop: "Requires export settings configuration",
  },
  {
    label: "CMS workflow",
    picmagiq: "Upload-ready file in one step",
    photoshop: "Multiple export steps required",
  },
  {
    label: "Film stock LUTs",
    picmagiq: "Kodak 2383, Fuji 3510, Bleach Bypass, more",
    photoshop: "Purchasable third-party plugins",
  },
  {
    label: "Runs in browser",
    picmagiq: "Yes — no installation",
    photoshop: "No — desktop app only",
  },
  {
    label: "Best for",
    picmagiq: "Website image production for marketing teams",
    photoshop: "Professional photo retouching and compositing",
  },
];

const usePhotoshop = [
  "You are retouching individual portraits at a pixel level.",
  "You are compositing multiple photographs for print.",
  "You are a professional photographer with RAW files from a DSLR.",
  "Your output is for print, not web.",
];

const usePicmagiq = [
  "You manage images for a CMS-driven marketing site.",
  "You want a consistent cinematic look across your site's images.",
  "Your output is WebP for web publishing.",
  "You don't have time to learn a professional image editing suite.",
];

export default function VsPhotoshopPage() {
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Photoshop is the right tool — for the wrong job
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Photoshop was designed for photographers, print designers, and visual effects artists.
            It is exceptional at what it does. But if you are a content manager uploading images to
            a CMS, Photoshop is 95% more tool than you need — and it is missing the one feature that
            matters most for web publishing: a direct WebP export with a baked-in color grade.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto">
          <div className="overflow-x-auto rounded-lg border border-ink-700">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ink-800">
                  <th className="text-left font-semibold text-ink-300 p-4"></th>
                  <th className="text-left font-semibold text-accent-400 p-4">picmagIQ</th>
                  <th className="text-left font-semibold text-white p-4">Photoshop</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-ink-900" : "bg-ink-800/50"}>
                    <th className="text-left font-semibold text-white p-4 align-top">
                      {row.label}
                    </th>
                    <td className="text-ink-200 p-4 align-top">{row.picmagiq}</td>
                    <td className="text-ink-200 p-4 align-top">{row.photoshop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The honest verdict */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">The honest answer</h2>
          <p className="text-ink-200 leading-relaxed">
            Photoshop is not the wrong tool because it is bad. It is the wrong tool because it is
            designed for a completely different job. A photographer editing a RAW file for a
            magazine spread needs Photoshop. A content manager who needs to apply a consistent
            cinematic look to ten blog header images and export them as WebP for a Webflow site does
            not. picmagIQ is not trying to replace Photoshop for professional photography work. It
            is trying to replace the improvised, time-consuming, Photoshop-based workflow that
            content managers use when they have no better option.
          </p>
        </div>
      </section>

      {/* Use case callout */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Use Photoshop when:</h2>
            <ul className="space-y-3">
              {usePhotoshop.map((item) => (
                <li key={item} className="text-ink-200 leading-relaxed flex gap-3">
                  <span className="text-ink-500 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold text-accent-400 mb-6">Use picmagIQ when:</h2>
            <ul className="space-y-3">
              {usePicmagiq.map((item) => (
                <li key={item} className="text-ink-200 leading-relaxed flex gap-3">
                  <span className="text-accent-500 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            The faster path to professional-looking website images
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
