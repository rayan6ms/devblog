/** @type {import('next').NextConfig} */
const remotePatterns = [
	{
		protocol: "https",
		hostname: "avatars.githubusercontent.com",
		port: "",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "lh3.googleusercontent.com",
		port: "",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "**.public.blob.vercel-storage.com",
		port: "",
		pathname: "/**",
	},
];

const nextConfig = {
	images: {
		remotePatterns,
	},
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
