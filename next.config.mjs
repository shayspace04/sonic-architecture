/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Serve AVIF first, then WebP for the next/image hero poster (/modernist-city.webp)
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1280, 1344, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Tree-shake heavy barrel exports to reduce main-thread JS parse/compile cost (TBT / INP)
    optimizePackageImports: ["framer-motion", "three"],
  },
  async headers() {
    return [
      {
        source:
          "/:all*(bg-720.mp4|bg-720.webm|sonic-architecture-bg.mp4|sonic-architecture-bg.webm|modernist-city.webp|modernist-city.avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
