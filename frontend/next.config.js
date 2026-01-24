const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Exclude firebase-admin and Node.js modules from client-side bundle
    if (!isServer) {
      // Set fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
        dns: false,
        'worker_threads': false,
      };
      
      // Completely ignore firebase-admin in client bundle
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^firebase-admin$/,
        })
      );
      
      // Ignore admin.js file from @aksara/firebase package
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /\/admin\.(js|ts)$/,
          contextRegExp: /@aksara\/firebase/,
        })
      );
    }
    
    return config;
  },
}

module.exports = nextConfig
