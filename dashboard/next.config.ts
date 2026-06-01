import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@chao/db"],
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
