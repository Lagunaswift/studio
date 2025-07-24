const nextConfig = {
    /* config options here */
    allowedDevOrigins: ['https://6000-firebase-studio-1749326160388.cluster-c3a7z3wnwzapkx3rfr5kz62dac.cloudworkstations.dev'],
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
};
export default nextConfig;
