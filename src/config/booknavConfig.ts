import type { BooknavGroup, BooknavPageConfig } from "../types/booknavConfig";

export const booknavPageConfig: BooknavPageConfig = {
	title: "",
	description: "",
	favicon: {
		enabled: true,
		api: "https://a.favicon.im/{domain}",
	},
};

export const booknavConfig: BooknavGroup[] = [
	{
		id: "dev",
		name: "Development",
		icon: "material-symbols:code-rounded",
		desc: "Useful tools for building and writing.",
		weight: 100,
		items: [
			{
				title: "GitHub",
				url: "https://github.com",
				desc: "Code hosting and collaboration.",
				icon: "fa7-brands:github",
				weight: 10,
			},
			{
				title: "MDN Web Docs",
				url: "https://developer.mozilla.org",
				desc: "Reference for web platform technologies.",
				weight: 9,
			},
			{
				title: "Astro",
				url: "https://astro.build",
				desc: "Content-focused web framework.",
				weight: 8,
			},
			{
				title: "Svelte",
				url: "https://svelte.dev",
				desc: "Compiler-first UI framework.",
				weight: 7,
			},
		],
	},
	{
		id: "design",
		name: "Design",
		icon: "material-symbols:palette-outline-rounded",
		desc: "Icons, assets, and visual references.",
		weight: 90,
		items: [
			{
				title: "Iconify",
				url: "https://icon-sets.iconify.design",
				desc: "Searchable open-source icon sets.",
				weight: 10,
			},
			{
				title: "Squoosh",
				url: "https://squoosh.app",
				desc: "Image compression and format conversion.",
				weight: 9,
			},
		],
	},
];
