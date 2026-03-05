/** @type {import('next').NextConfig} */
const allowedHosts = [
	"revolucaonerd.com",
	"lumiere-a.akamaihd.net",
	"heroichollywood.com",
	"www.cafehistoria.com.br",
	"imagens.brasil.elpais.com",
	"imageio.forbes.com",
	"amazonasatual.com.br",
	"cdn.marvel.com",
	"i.etsystatic.com",
	"www.coliseugeek.com.br",
	"disneyplusbrasil.com.br",
	"epipoca.com.br",
	"hitsite.com.br",
	"wallpapercave.com",
	"ovicio.com.br",
	"uploads.jovemnerd.com.br",
	"www.playstationlifestyle.net",
	"soundvenue.com",
	"www.hollywoodreporter.com",
	"www.wallpaperflare.com",
	"s2-techtudo.glbimg.com",
	"static.wikia.nocookie.net",
	"media.newyorker.com",
	"gamehall.com.br",
	"cdn.marvel.com",
	"www.geo.tv",
	"miro.medium.com",
	"myfamilycinema.com",
	"static.itapemafm.com.br",
	"cinebuzz.com.br",
	"lojalimitededition.vteximg.com.br",
	"media.gq.com",
	"i.insider.com",
	"www.kametoys.cl",
	"i.pinimg.com",
	"static1.moviewebimages.com",
	"admin.cnnbrasil.com.br",
	"i0.wp.com",
];

const nextConfig = {
	images: {
		remotePatterns: allowedHosts.map((hostname) => ({
			protocol: "https",
			hostname,
			port: "",
			pathname: "/**",
		})),
	},
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
