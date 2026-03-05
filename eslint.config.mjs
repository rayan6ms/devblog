import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
	...nextVitals,
	{
		files: ["app/playground/**/*.{js,jsx,ts,tsx}"],
		rules: {
			"@next/next/no-img-element": "off",
			"react-hooks/exhaustive-deps": "off",
			"react-hooks/incompatible-library": "off",
			"react-hooks/preserve-manual-memoization": "off",
			"react-hooks/purity": "off",
			"react-hooks/refs": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/unsupported-syntax": "off",
			"react-hooks/use-memo": "off",
		},
	},
	{
		files: [
			"app/new_post/Form.tsx",
			"app/new_post/MarkdownEditor.tsx",
			"app/post/**/*.tsx",
			"app/profile/ProfileEditModal.tsx",
		],
		rules: {
			"@next/next/no-img-element": "off",
			"react-hooks/incompatible-library": "off",
		},
	},
	{
		rules: {
			"@next/next/no-page-custom-font": "off",
		},
	},

	globalIgnores([
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		"node_modules/**",

		"app/generated/**",
	]),
]);
