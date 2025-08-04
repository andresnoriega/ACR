
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // This allows requests from the Studio preview environment.
    allowedDevOrigins: ["https://*.cluster-iesosxm5fzdewqvhlwn5qivgry.cloudworkstations.dev"],
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
  // Expose environment variables to the client-side
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
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
