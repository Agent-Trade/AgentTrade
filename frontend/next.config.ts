import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration (for local builds with --webpack)
  webpack: (config, { isServer }) => {
    try {
      const webpack = require("webpack");
      
      // Ignore test files from node_modules
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /\/test\//,
          contextRegExp: /node_modules/,
        })
      );

      // Ignore React Native dependencies that aren't needed for web
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
      };
    } catch (e) {
      // webpack not available (using Turbopack)
    }
    
    return config;
  },
  
  // Exclude problematic packages from server components
  serverComponentsExternalPackages: [
    'thread-stream',
    'pino',
    '@react-native-async-storage/async-storage',
  ],
  
  // Turbopack configuration for Vercel
  experimental: {
    turbo: {
      resolveAlias: {
        '@react-native-async-storage/async-storage': false,
      },
    },
  },
};

export default nextConfig;
