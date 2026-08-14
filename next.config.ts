import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Mastra runs on the Node.js runtime and must not be bundled by Next.js.
  serverExternalPackages: ["@mastra/core", "@mastra/ai-sdk"],
}

export default nextConfig
