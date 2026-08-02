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
};

module.exports = withPWA(nextConfig);
