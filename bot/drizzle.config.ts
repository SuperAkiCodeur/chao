import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  driver: "neon-http",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
