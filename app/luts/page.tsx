import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Film LUTs & Color Grading — The History Behind the Look | picmagIQ",
  description:
    "Explore the real film stocks behind picmagIQ's Premium LUT presets — from Kodak 2383 print film used in Inception and The Dark Knight to Fujifilm's Super F-CP 3510 and the bleach bypass process behind Seven and Saving Private Ryan.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Film Stocks Behind the LUTs",
  description:
    "Explore the real film stocks behind picmagIQ's Premium LUT presets — from Kodak 2383 print film used in Inception and The Dark Knight to Fujifilm's Super F-CP 3510 and the bleach bypass process behind Seven and Saving Private Ryan.",
  publisher: {
    "@type": "Organization",
    name: "picmagIQ",
    url: "https://picmagiq.com",
  },
  url: "https://picmagiq.com/luts",
};

export default function LutsPage() {
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
            Film History
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            The Film Stocks Behind the Look
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            A LUT is not just a color filter. It&apos;s a mathematical map of how a specific roll
            of film responded to light — its toe, its shoulder, its grain, its color science. Every
            Premium preset in picmagIQ is rooted in a real film stock with a real history.
          </p>
        </div>
      </section>

      {/* What is a LUT? */}
      <section className="py-16 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">What is a LUT?</h2>
          <p className="text-ink-200 leading-relaxed mb-5">
            A Look Up Table (LUT) is a file that maps input color values to output color values. In
            cinema, print film emulation LUTs are derived from the measured spectral and
            colorimetric response of actual physical film stocks — the way they compress highlights,
            lift shadows, shift color in the mids, and introduce grain.
          </p>
          <p className="text-ink-200 leading-relaxed">
            When applied to a digital image, a LUT replaces the clinical linearity of a digital
            sensor with the organic, non-linear response of chemical film. The result is an image
            that feels observed rather than captured — shaped by the physical constraints of a
            medium that no longer exists.
          </p>
        </div>
      </section>

      {/* Kodak 2383 */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent-400 bg-accent-500/10 px-3 py-1 rounded-full mb-5">
            Premium Preset
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Kodak Vision Color Print Film 2383
          </h2>
          <p className="text-ink-300 text-sm mb-10">
            Mid-1990s through early 2010s{" "}
            <span className="block sm:inline">&middot; The dominant Hollywood print stock of its era</span>
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Character
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Warm, rich blacks, neutral highlights, wide dynamic range (~13 stops). The toe and
                shoulder of the sensitometric curve give it a natural, non-linear contrast that
                digital sensors lack. Mids read slightly warm; shadows hold detail without crushing.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                History
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Kodak 2383 was not a camera negative stock — it was a print film. After a movie was
                shot and edited, the final digital or negative cut was transferred onto 2383 for
                projection in theaters worldwide. It was the last chemical step before the audience
                saw the image, meaning its color science is baked into the visual memory of an
                entire era of cinema. Kodak introduced the stock with a new ESTAR polyester base
                that replaced rem-jet backing, improving durability and print cleanliness on
                high-speed printers.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Notable Films
              </h3>
              <p className="text-ink-200 leading-relaxed">
                <em>Inception</em> (2010, DP Wally Pfister), <em>The Dark Knight</em> (2008, DP
                Wally Pfister), <em>Batman Begins</em> (2005), <em>Minority Report</em> (2002, DP
                Janusz Kaminski), <em>Munich</em> (2005), <em>Interstellar</em> (2014),{" "}
                <em>Dunkirk</em> (2017), <em>Tenet</em> (2020). Over 580 titles were printed on
                this stock.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/editor"
              className="inline-block bg-accent-500 hover:bg-accent-400 text-white font-semibold px-6 py-3 rounded transition-colors text-sm"
            >
              Try Kodak 2383 in picmagIQ
            </Link>
          </div>
        </div>
      </section>

      {/* Fuji 3510 */}
      <section className="py-20 px-6 bg-ink-800 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent-400 bg-accent-500/10 px-3 py-1 rounded-full mb-5">
            Premium Preset
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Fujifilm Super F-CP 3510</h2>
          <p className="text-ink-300 text-sm mb-10">
            Introduced 2002{" "}
            <span className="block sm:inline">&middot; Fujifilm&apos;s answer to Kodak&apos;s dominance in print film</span>
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Character
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Cooler mids than Kodak 2383 — a subtle green-teal cast in the midtones, softer
                highlight rolloff, and lifted shadows that give images a luminous, airy quality.
                Skin tones render with natural warmth despite the cooler overall grade. Some
                colorists describe 3510 as sharing character with Fujifilm&apos;s 400H still
                photography stock, favored by portrait and wedding photographers for its soft,
                true-to-life color.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                History
              </h3>
              <p className="text-ink-200 leading-relaxed">
                The 3510 is part of Fujifilm&apos;s Super F-Series of print films, introduced on a
                polyester base in 2002 alongside the 3513DI (a high-contrast digital intermediate
                variant). Fujifilm had competed with Kodak in motion picture film since the 1930s,
                and the Super F-CP line represented their most refined print emulsion. The stock was
                used in arthouse and international productions that preferred Fuji&apos;s cooler,
                more restrained palette over Kodak&apos;s warmer signature. Fujifilm eventually
                discontinued their motion picture film line as digital cinema projection made print
                film obsolete.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Notable Use
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Favored in productions that used Fujifilm negative stocks (Eterna series) end-to-end
                for a consistent Fuji color science, particularly in Japanese, European, and
                independent cinema.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/editor"
              className="inline-block bg-accent-500 hover:bg-accent-400 text-white font-semibold px-6 py-3 rounded transition-colors text-sm"
            >
              Try Fuji 3510 in picmagIQ
            </Link>
          </div>
        </div>
      </section>

      {/* Bleach Bypass */}
      <section className="py-20 px-6 border-b border-ink-700">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent-400 bg-accent-500/10 px-3 py-1 rounded-full mb-5">
            Premium Preset
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Bleach Bypass</h2>
          <p className="text-ink-300 text-sm mb-10">
            Invented 1957–1960{" "}
            <span className="block sm:inline">&middot; Popularized in Western cinema from the mid-1980s onward</span>
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Character
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Retained silver grain layered over color dyes produces deep blacks, crushed
                contrast, heavily desaturated color, and a gritty silver sheen. Not a film stock —
                a darkroom process applied to any stock. The result is a black-and-white image
                superimposed over a color image, giving footage an unsettling, hyper-real quality
                that no camera stock achieves naturally.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                History
              </h3>
              <p className="text-ink-200 leading-relaxed">
                Bleach bypass skips the bleaching step in color film processing, leaving metallic
                silver in the emulsion alongside the color dyes. The technique was invented by
                Japanese cinematographer Kazuo Miyagawa for director Hiroshi Inagaki&apos;s{" "}
                <em>Rickshaw Man</em> (1957) and Kon Ichikawa&apos;s <em>Her Brother</em> (1960),
                inspired by the muted tones of the 1956 Technicolor print of <em>Moby Dick</em>.
                The process remained largely overlooked in Western cinema until Roger Deakins
                applied it to every release print of Michael Radford&apos;s{" "}
                <em>Nineteen Eighty-Four</em> (1984) — a decision that launched the technique into
                mainstream use. Cinematographer Darius Khondji refined it further through the
                1990s, using partial bleach bypass via Deluxe Laboratories&apos; CCE (Color
                Contrast Enhancement) process on <em>Se7en</em> (1995) with David Fincher.
                Technicolor&apos;s proprietary ENR process — named for its inventor, Ernesto
                Novelli Risi — was a silver retention variant used on films like <em>Reds</em>{" "}
                (1981) and later <em>Saving Private Ryan</em>.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-300 mb-3">
                Notable Films
              </h3>
              <p className="text-ink-200 leading-relaxed">
                <em>Nineteen Eighty-Four</em> (1984, DP Roger Deakins), <em>Se7en</em> (1995, DP
                Darius Khondji), <em>Saving Private Ryan</em> (1998), <em>Fight Club</em> (1999),{" "}
                <em>Minority Report</em> (2002), <em>The Grifters</em> (1989, DP Oliver Stapleton).
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/editor"
              className="inline-block bg-accent-500 hover:bg-accent-400 text-white font-semibold px-6 py-3 rounded transition-colors text-sm"
            >
              Try Bleach Bypass in picmagIQ
            </Link>
          </div>
        </div>
      </section>

      {/* Additional shorter entries */}
      <section className="py-20 px-6 bg-ink-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-12">Additional Premium Presets</h2>
          <div className="space-y-10">
            <div className="border-l-2 border-accent-500/40 pl-6">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-white font-bold text-lg">Split Tone Pro</h3>
                <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                  Premium
                </span>
              </div>
              <p className="text-ink-200 leading-relaxed mb-4">
                The teal-and-orange split has roots in photochemical printing — skin tones and warm
                light sources fall in the orange zone, while cooler environments and shadows fall in
                teal. The separation creates the maximum perceptual contrast between foreground
                subjects and background environments, which is why it became the signature grade of
                blockbuster cinema in the 2000s and 2010s.
              </p>
              <Link
                href="/editor"
                className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors"
              >
                Try it in picmagIQ →
              </Link>
            </div>

            <div className="border-l-2 border-accent-500/40 pl-6">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-white font-bold text-lg">Cool Fade</h3>
                <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                  Premium
                </span>
              </div>
              <p className="text-ink-200 leading-relaxed mb-4">
                A flat, editorial look that references the pulled-down contrast of overexposed or
                fogged negative film. The lifted blacks recall the look of film that has been
                slightly fogged by age or light leaks — favored in fashion and editorial photography
                for its quiet, deliberate restraint.
              </p>
              <Link
                href="/editor"
                className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors"
              >
                Try it in picmagIQ →
              </Link>
            </div>

            <div className="border-l-2 border-accent-500/40 pl-6">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-white font-bold text-lg">Warm Print</h3>
                <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded-full">
                  Premium
                </span>
              </div>
              <p className="text-ink-200 leading-relaxed mb-4">
                Warm print emulations reference the amber cast introduced by incandescent projection
                bulbs and aged theatrical prints. Over decades of theatrical exhibition, warm color
                drift became synonymous with nostalgia and the feeling of watching something
                important.
              </p>
              <Link
                href="/editor"
                className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors"
              >
                Try it in picmagIQ →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Apply these looks to your images</h2>
          <p className="text-ink-300 leading-relaxed mb-8">
            All six Premium LUT presets are available in picmagIQ&apos;s Premium plan. No color
            grading software required.
          </p>
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
