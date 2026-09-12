/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["@mui/material", "lucide-react", "recharts", "date-fns"],
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
