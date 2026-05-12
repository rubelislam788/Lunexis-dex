/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required for viem/wagmi to work correctly in Next.js 15
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Suppress missing optional native deps from MetaMask SDK & WalletConnect
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "lokijs": false,
      "encoding": false,
    };
    return config;
  },
};

module.exports = nextConfig;
