import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Static assets - 1 year cache
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Images - 1 month cache
      {
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000' },
        ],
      },
      // API routes - no cache
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // HTML pages - short cache with revalidation
      {
        source: '/((?!api|_next/static|images).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
  async redirects() {
    return [];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack(config, { isServer, dev }) {
    // Copy prompts directory to build output for Genkit
    if (isServer && !dev) {
      const CopyWebpackPlugin = require('copy-webpack-plugin');
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'prompts',
              to: 'prompts',
              noErrorOnMissing: false,
            },
          ],
        })
      );
    }

    // Handle handlebars templates
    config.module.rules.push({
      test: /\.hbs$/,
      loader: 'handlebars-loader',
    });

    // Handle prompt files
    config.module.rules.push({
      test: /\.prompt$/,
      type: 'asset/source',
    });

    // ✅ CRITICAL: Exclude server-only modules from client bundle
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        // Node.js built-ins
        'fs': 'commonjs fs',
        'net': 'commonjs net',
        'tls': 'commonjs tls',
        'crypto': 'commonjs crypto',
        'stream': 'commonjs stream',
        'path': 'commonjs path',
        'os': 'commonjs os',
        'util': 'commonjs util',
        // Google Cloud modules that require Node.js
        '@google-cloud/logging': 'commonjs @google-cloud/logging',
        '@google-cloud/opentelemetry-cloud-trace-exporter': 'commonjs @google-cloud/opentelemetry-cloud-trace-exporter',
        '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        // OpenTelemetry modules (server-only)
        '@opentelemetry/auto-instrumentations-node': 'commonjs @opentelemetry/auto-instrumentations-node',
        '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        // Firebase Admin (server-only)
        'firebase-admin': 'commonjs firebase-admin',
        // Genkit server modules
        '@genkit-ai/firebase': 'commonjs @genkit-ai/firebase',
        '@genkit-ai/google-cloud': 'commonjs @genkit-ai/google-cloud',
      });
    }

    return config;
  },
};

export default nextConfig;
