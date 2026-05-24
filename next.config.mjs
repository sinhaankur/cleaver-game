/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages. No SSR, no API routes, no middleware —
  // the whole game runs client-side after hydration, so a flat HTML/JS
  // bundle works fine.
  output: "export",

  // Custom domain (cleaver.sinhaankur.com) serves from "/" — no basePath
  // or assetPrefix needed. Trailing slash so /index.html is the served
  // file for the root.
  trailingSlash: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
}

export default nextConfig
