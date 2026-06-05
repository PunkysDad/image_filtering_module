/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "playwright"],
  },
  swcMinify: false,
};
export default nextConfig;
