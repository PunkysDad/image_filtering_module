import Link from "next/link";

export default function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#1a1a1a] backdrop-blur-sm border-b border-[#333333]">
      {/* Desktop layout */}
      <div className="hidden sm:flex max-w-6xl mx-auto px-6 h-14 items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          picmagIQ
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-ink-300 text-sm hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/luts" className="text-ink-300 text-sm hover:text-white transition-colors">
            Film LUTs
          </Link>
          <div className="relative group">
            <button className="text-ink-300 text-sm hover:text-white transition-colors cursor-default">
              Features ▾
            </button>
            <div className="hidden group-hover:block absolute left-0 top-full pt-2 z-50">
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-md py-2 min-w-[200px] shadow-lg">
                <Link
                  href="/cinematic-filters"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Cinematic Filters
                </Link>
                <Link
                  href="/film-grain"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Film Grain
                </Link>
                <Link
                  href="/color-grading-for-marketers"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Color Grading
                </Link>
                <Link
                  href="/webp-export"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  WebP Export
                </Link>
                <Link
                  href="/vs-photoshop"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  vs Photoshop
                </Link>
                <Link
                  href="/compositing"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Compositing
                </Link>
                <Link
                  href="/knockout-text"
                  className="block px-4 py-2 text-ink-300 text-sm hover:text-white hover:bg-ink-800 transition-colors"
                >
                  Knockout Text
                </Link>
              </div>
            </div>
          </div>
          <Link href="/blog" className="text-ink-300 text-sm hover:text-white transition-colors">
            Blog
          </Link>
          <Link href="/editor" className="text-ink-300 text-sm hover:text-white transition-colors">
            Editor
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/editor" className="text-ink-300 text-sm hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/editor"
            className="bg-accent-500 hover:bg-accent-400 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>

      {/* Mobile layout — entire section hidden at sm+, avoiding peer-checked specificity conflicts */}
      <div className="sm:hidden">
        <input type="checkbox" id="nav-toggle" className="sr-only peer" />
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-lg tracking-tight">
            picmagIQ
          </Link>
          <label htmlFor="nav-toggle" className="cursor-pointer p-2 -mr-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="2" y1="5" x2="18" y2="5" />
              <line x1="2" y1="10" x2="18" y2="10" />
              <line x1="2" y1="15" x2="18" y2="15" />
            </svg>
          </label>
        </div>
        <div className="hidden peer-checked:block">
          <Link
            href="/"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Home
          </Link>
          <Link
            href="/luts"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Film LUTs
          </Link>
          <Link
            href="/cinematic-filters"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Cinematic Filters
          </Link>
          <Link
            href="/film-grain"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Film Grain
          </Link>
          <Link
            href="/color-grading-for-marketers"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Color Grading
          </Link>
          <Link
            href="/webp-export"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            WebP Export
          </Link>
          <Link
            href="/vs-photoshop"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            vs Photoshop
          </Link>
          <Link
            href="/compositing"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Compositing
          </Link>
          <Link
            href="/knockout-text"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Knockout Text
          </Link>
          <Link
            href="/blog"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Blog
          </Link>
          <Link
            href="/editor"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Editor
          </Link>
          <Link
            href="/editor"
            className="block px-6 py-3 text-ink-300 hover:text-white hover:bg-ink-800 transition-colors border-t border-[#333333]"
          >
            Sign In
          </Link>
          <Link
            href="/editor"
            className="block px-6 py-3 bg-accent-500 text-white text-sm font-semibold hover:bg-accent-400 transition-colors border-t border-[#333333]"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}
