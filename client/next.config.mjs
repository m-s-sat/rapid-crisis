/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://127.0.0.1:3001/api/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3002/api/:path*',
      },
    ];
  },
};

export default nextConfig;
