/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ['app', 'components', 'lib', 'scripts'],
  },
  typescript: {
    // O build falha em erro de tipo. Nunca ligar ignoreBuildErrors.
    ignoreBuildErrors: false,
  },
}

export default nextConfig
