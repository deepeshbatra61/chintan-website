/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // iOS fetches this (no file extension) to allow www.chintan.news/article/*
  // to open the app; Apple wants it served as JSON.
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

module.exports = nextConfig;
