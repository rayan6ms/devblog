/** @type {import('next').NextConfig} */
const allowedHosts = [
	"avatars.githubusercontent.com",
	"lh3.googleusercontent.com",
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
