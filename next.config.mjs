/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["sharp", "playwright"],
  },
  swcMinify: false,
};
export default nextConfig;
