import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration - works for both local and Vercel builds
  webpack: (config, { isServer }) => {
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
    
    return config;
  },
};

export default nextConfig;
