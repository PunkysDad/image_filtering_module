import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Blog — Image Editing Tips for Marketing Teams | picmagIQ",
  description:
    "Practical guides for marketing and content managers on cinematic image filters, WebP export, color grading, and getting professional-quality visuals into your CMS without Photoshop.",
  openGraph: {
    title: "Blog — Image Editing Tips for Marketing Teams | picmagIQ",
    description:
      "Practical guides for marketing and content managers on cinematic image filters, WebP export, color grading, and getting professional-quality visuals into your CMS without Photoshop.",
    url: "https://picmagiq.com/blog",
    siteName: "picmagIQ",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "picmagIQ Blog",
  description:
    "Practical guides for marketing and content managers on cinematic image filters, WebP export, color grading, and getting professional-quality visuals into your CMS without Photoshop.",
  url: "https://picmagiq.com/blog",
};

const posts = [
  {
    category: "CMS Workflow",
    title: "How to Give Your WordPress Site a Cinematic Look Without Photoshop",
    excerpt:
      "A step-by-step guide for content managers who want professional color grades on their WordPress images without touching a single plugin or stylesheet.",
    readTime: "5 min read",
    url: "/blog/cinematic-wordpress-images",
  },
  {
    category: "Film & Color",
    title: "What Is a LUT? A Plain-English Guide for Marketing Teams",
    excerpt:
      "LUTs are the color science behind Hollywood cinema — and they're now available to anyone publishing images to the web. Here's what they are and why they matter.",
    readTime: "4 min read",
    url: "/blog/what-is-a-lut",
  },
  {
    category: "Web Performance",
    title: "Why WebP Is the Right Image Format for Your CMS in 2026",
    excerpt:
      "JPEG and PNG are legacy formats. WebP delivers 25–40% smaller file sizes with no visible quality loss. Here's what that means for your site's speed, SEO, and Core Web Vitals.",
    readTime: "4 min read",
    url: "/blog/webp-for-cms",
  },
];

export default function BlogIndexPage() {
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
            From the picmagIQ blog
          </h1>
          <p className="text-ink-200 text-lg leading-relaxed max-w-2xl">
            Practical guides for marketing and content teams who want professional image aesthetics
            without the Photoshop learning curve.
          </p>
        </div>
      </section>

      {/* Post list */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.url}
                className="bg-ink-800 border border-ink-700 rounded-lg p-6 flex flex-col"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-4">
                  {post.category}
                </p>
                <h2 className="text-white font-bold text-lg leading-snug mb-3">
                  <Link href={post.url} className="hover:text-accent-400 transition-colors">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-ink-200 text-sm leading-relaxed mb-6">{post.excerpt}</p>
                <div className="mt-auto flex items-center justify-between">
                  <Link
                    href={post.url}
                    className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors"
                  >
                    Read →
                  </Link>
                  <span className="text-ink-300 text-xs">{post.readTime}</span>
                </div>
              </article>
            ))}
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
