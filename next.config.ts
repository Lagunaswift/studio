import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  async redirects() {
    return [];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
  webpack(config, { isServer }) {
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