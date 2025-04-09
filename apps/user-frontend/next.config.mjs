/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d23u46oquy85pk.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
