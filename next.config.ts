import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Mastra runs on the Node.js runtime and must not be bundled by Next.js.
  serverExternalPackages: ["@mastra/core", "@mastra/ai-sdk"],
  // Agent skills are read from disk at request time, so the markdown has to
  // ship with the traced output of the chat route.
  outputFileTracingIncludes: {
    "/api/chat": ["./mastra/skills/**/*"],
  },
}

export default nextConfig
