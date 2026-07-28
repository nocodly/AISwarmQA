import { defineConfig } from "prisma/config";
import { readRuntimeConfig } from "@ai-swarm-qa/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: readRuntimeConfig().databaseUrl
  }
});
