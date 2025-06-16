
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
  // Remove the root redirect, AuthContext will handle it.
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/inicio',
  //       permanent: true,
  //     },
  //   ]
  // },
};

export default nextConfig;
