const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    importScripts: ["/custom-sw.js"],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@devpulse/database"],
  // Ensure Prisma query engines are copied into the Vercel serverless bundle.
  // https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
  serverExternalPackages: ["@prisma/client", "prisma"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
