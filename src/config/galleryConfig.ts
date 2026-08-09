import type { GalleryConfig } from "@/types/galleryConfig";

export const galleryConfig: GalleryConfig = {
	albums: [
		{
			id: "firefly-2026",
			name: "Wallpapers",
			description:
				"A starter album. Replace these images with your own photos or artwork.",
			location: "Personal Archive",
			date: "2026-08-09",
			tags: ["Wallpaper", "Starter"],
		},
		{
			id: "encrypted-test",
			name: "Private Album Example",
			description:
				"A password-protected album example for private collections.",
			location: "Private",
			date: "2026-08-09",
			tags: ["Private", "Example"],
			password: "123456",
			passwordHint: "Example password: 123456",
		},
	],
	columnWidth: 240,
};
