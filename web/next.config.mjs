const apiOrigin = process.env.API_URL ?? 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/files/:path*', destination: `${apiOrigin}/files/:path*` }];
  },
};

export default nextConfig;
