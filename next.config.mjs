/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gera .next/standalone com apenas as dependencias usadas em runtime.
  // Necessario para a imagem Docker enxuta usada no deploy (EasyPanel).
  output: 'standalone',
  eslint: {
    dirs: ['app', 'components', 'lib', 'scripts'],
  },
  typescript: {
    // O build falha em erro de tipo. Nunca ligar ignoreBuildErrors.
    ignoreBuildErrors: false,
  },
}

export default nextConfig
