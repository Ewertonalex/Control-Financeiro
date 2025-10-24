/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // gerar build estático para empacotar no desktop (Tauri)
  output: 'export',
};

export default nextConfig;


