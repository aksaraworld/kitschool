const webpack = require('webpack');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Ensure @ resolves to frontend (Vercel cwd can differ)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, '.'),
    };
    const rootModules = path.resolve(__dirname, '..', 'node_modules');
    config.resolve.modules = [...(config.resolve.modules || []), rootModules];
    // Exclude firebase-admin and Node.js modules from client-side bundle
    if (!isServer) {
      // Set fallbacks for Node.js modules (prevents webpack from trying to bundle them)
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
      
      // Ignore firebase-admin completely
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^firebase-admin$/,
        })
      );
      
      // Ignore admin.js/ts files from @aksara/firebase
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /admin\.(js|ts)$/,
          contextRegExp: /@aksara\/firebase/,
        })
      );
    }
    
    return config;
  },
}

module.exports = nextConfig
