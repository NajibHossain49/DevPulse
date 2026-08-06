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
  // Keep Prisma engines out of the bundler so the RHEL query engine is found on Vercel.
  serverExternalPackages: ["@prisma/client", "prisma", "@devpulse/database"],
};

module.exports = withPWA(nextConfig);
