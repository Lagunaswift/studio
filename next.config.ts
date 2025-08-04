//next.config.ts
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // {
      //   source: '/',
      //   destination: '/login',
      //   permanent: false, 
      // },
    ];
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
  webpack(config) {
    config.module.rules.push({
      test: /\.hbs$/,
      loader: 'handlebars-loader',
    });
    return config;
  },
};

export default nextConfig;
