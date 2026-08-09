import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	title: "Notice",
	content:
		"This blog is being customized. Replace this message in src/config/announcementConfig.ts.",
	closable: true,
	link: {
		enable: true,
		text: "About",
		url: "/about/",
		external: false,
	},
};
