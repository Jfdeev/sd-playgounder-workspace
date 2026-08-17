import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @sdp/engine é consumido como TS cru via workspace (sem build step, ver package.json —
  // main/types apontam direto pra src/index.ts). Next não transpila TS de fora de apps/web por
  // padrão; isso é o que faz esse import funcionar (spike de risco do M1, ver plan.md research.md).
  transpilePackages: ["@sdp/engine"],
  webpack(config) {
    // packages/engine usa imports relativos com extensão .js (convenção do moduleResolution
    // NodeNext do TS, mesmo apontando pra arquivos .ts) — webpack não resolve isso por padrão
    // (só tsc/vitest fazem essa reescrita). Sem isto: "Module not found: Can't resolve './x.js'"
    // (confirmado empiricamente no spike de M1).
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
