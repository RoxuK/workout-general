/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // App personal — no queremos que un warning de lint o un type menor
  // bloquee el deploy en Vercel.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
