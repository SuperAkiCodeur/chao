import path from "path";
import type { NextConfig } from "next";

const DB_SCHEMA = path.resolve(__dirname, "../packages/db/src/schema.ts");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: { "@chao/db": DB_SCHEMA },
  },
  webpack(config) {
    config.resolve.alias["@chao/db"] = DB_SCHEMA;
    return config;
  },
};

export default nextConfig;
