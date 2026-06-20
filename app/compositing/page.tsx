import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Online Image Compositing for Marketing Teams — Combine Subjects into One Branded Image | picmagIQ",
  description:
    "Combine multiple subjects into a single branded image online. Automatic background removal, per-subject color grading, drag-to-position, and a brush mask editor — exported as CMS-ready WebP. No Photoshop, no designer.",
  openGraph: {
    title: "Online Image Compositing for Marketing Teams — Combine Subjects into One Branded Image | picmagIQ",
    description:
      "Combine multiple subjects into a single branded image online. Automatic background removal, per-subject color grading, drag-to-position, and a brush mask editor — exported as CMS-ready WebP. No Photoshop, no designer.",
    url: "https://picmagiq.com/compositing",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Online Image Compositing for Marketing Teams",
  description:
    "Combine multiple subjects into a single branded image online. Automatic background removal, per-subject color grading, drag-to-position, and a brush mask editor — exported as CMS-ready WebP. No Photoshop, no designer.",
  url: "https://picmagiq.com/compositing",
};

const capabilities = [
  {
    name: "Automatic background removal",
    body: "Drop in a photo and picmagIQ isolates the subject from its background automatically, in the browser. The cutout becomes a transparent layer you can place anywhere — no manual selection, no clipping paths.",
  },
  {
    name: "Multiple subjects in one image",
    body: "Stack up to five isolated subjects into a single composite. Pull a product shot, a team member, and a logo treatment into one frame and arrange them into a finished marketing image.",
  },
  {
    name: "Per-subject filter stacks",
    body: "Each subject carries its own filter stack — color grade, grain, curves, and masks — so every element can be matched to the same look or styled independently. Consistent grading across mismatched source photos.",
  },
  {
    name: "Drag-to-position",
    body: "Move, scale, and arrange each subject directly on the canvas with drag handles. Position elements by eye until the composition reads the way you want it.",
  },
  {
    name: "Brush mask editor",
    body: "Refine any automatic cutout by hand with erase and restore brushes, adjustable brush size and hardness, and full undo/redo. Clean up stray edges or bring back detail the auto-removal trimmed.",
  },
  {
    name: "Global overlay layer",
    body: "Lay a single overlay image across the entire composite — a texture, a gradient, a branded frame — with its own filter stack, sitting on top of the background and every subject.",
  },
];

export default function CompositingPage() {
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
            Compositing
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Build one branded image from many subjects
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            picmagIQ&apos;s compositing workspace lets you combine multiple subjects — product
            shots, team photos, logos, cutouts — into a single, cohesive marketing image. Background
            removal is automatic, every element can be color-graded to match, and the finished
            composite exports as a CMS-ready WebP. No Photoshop. No designer. No developer ticket.
          </p>
        </div>
      </section>

      {/* What it is */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Not a layer of filters — a layout of subjects.
            </h2>
            <p className="text-ink-200 leading-relaxed">
              The compositing workspace is different from stacking filters on one photo. Here you
              start with a background and add isolated subjects on top of it, each cut out from its
              own source image. Think of it as assembling a scene rather than grading a single
              frame — the right tool when one image needs to bring several things together.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Everything matched, everything baked in.</h2>
            <p className="text-ink-200 leading-relaxed">
              Because each subject carries its own filter stack, you can apply the same{" "}
              <Link
                href="/color-grading-for-marketers"
                className="text-accent-500 hover:text-accent-400 transition-colors"
              >
                color grade
              </Link>{" "}
              to mismatched source photos so they read as one image. The composite renders
              server-side and exports as a finished WebP — the layout, the cutouts, and the grading
              are all baked into a single file.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">What the workspace gives you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => (
              <div
                key={cap.name}
                className="bg-ink-800 border border-ink-700 rounded-lg p-6 flex flex-col"
              >
                <h3 className="text-white font-bold text-lg mb-3">{cap.name}</h3>
                <p className="text-ink-200 leading-relaxed text-sm">{cap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Built for the images marketing teams actually publish
          </h2>
          <p className="text-ink-200 leading-relaxed">
            A hero banner with three products. A team page where every headshot was taken in a
            different room. A campaign visual that needs your logo treated over a photograph.
            These are compositing jobs, and they normally mean a Photoshop license and someone who
            knows how to use it. picmagIQ puts that workflow in the browser for the people who
            manage a website — and pairs it with{" "}
            <Link
              href="/knockout-text"
              className="text-accent-500 hover:text-accent-400 transition-colors"
            >
              knockout text
            </Link>{" "}
            for typographic treatments that show imagery through the letterforms.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Composite your next marketing image
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
