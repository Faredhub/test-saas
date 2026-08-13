// Plain JS config for prisma migrate deploy in production Docker container
// (prisma.config.ts requires tsx which isn't available in the slim runtime image)
require("dotenv/config");
const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx ./prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
