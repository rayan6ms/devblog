/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['revolucaonerd.com', 'imagens.brasil.elpais.com', 'imageio.forbes.com', 'i.etsystatic.com', 'www.coliseugeek.com.br', 'disneyplusbrasil.com.br', 'epipoca.com.br', 'hitsite.com.br', 'wallpapercave.com', 'ovicio.com.br', 'uploads.jovemnerd.com.br', 'www.playstationlifestyle.net', 'soundvenue.com', 'www.hollywoodreporter.com'],
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
