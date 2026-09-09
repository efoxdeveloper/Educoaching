/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["@mui/material"],
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
