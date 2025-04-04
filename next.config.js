/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure Node.js modules are not bundled into the client-side code
      config.resolve.fallback = {
        fs: false,
        path: false,
        // Add other Node.js modules if needed
      };
    }
    return config;
  },
};

module.exports = nextConfig;