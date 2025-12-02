/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
        },
      ],
    },
  ],
};

export default nextConfig;
