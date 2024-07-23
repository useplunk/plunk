/** @type {import('next').NextConfig} */
module.exports = {
	reactStrictMode: true,
	swcMinify: true,
	webpack(config) {
		config.module.rules.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"],
		});

		config.module.rules.push({
			test: [/src\/(components|layouts)\/index.ts/i],
			sideEffects: false,
		});

		return config;
	},
};
