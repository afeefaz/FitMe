import withPWA from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const repoName = process.env.GITHUB_PAGES_REPO || "FitMe";
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? `/${repoName}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubPages ? "export" : "standalone",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "exercisedb-api-navy.vercel.app",
      },
      {
        protocol: "https",
        hostname: "*.exercisedb.io",
      },
      {
        protocol: "https",
        hostname: "static.exercisedb.dev",
      },
    ],
  },
};

export default withNextIntl(withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig));
