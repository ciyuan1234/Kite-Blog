import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";

export const backgroundWallpaper: BackgroundWallpaperConfig = {
	mode: "banner" as BackgroundWallpaperConfig["mode"],
	playerEnable: false,
	src: {
		desktop: ["https://c.53326.com/d/file/lan20221010/yeprusvetkx.jpg"],
		mobile: ["https://c.53326.com/d/file/lan20221010/yeprusvetkx.jpg"],
		playerUrl: "",
	},
	common: {
		dimOpacity: 0.2,
		playerMode: "random",
		homeText: {
			enable: true,
			title: "KiteBlog",
			titleSize: "4.5rem",
			subtitle: [
				"记录技术、项目与生活",
				"把零散想法写成长期笔记",
				"持续构建，持续整理",
				"在公开写作里沉淀经验",
			],
			subtitleSize: "1.5rem",
			typewriter: {
				enable: true,
				speed: 70,
				deleteSpeed: 35,
				pauseTime: 2000,
			},
		},
		postInfo: {
			mode: "description",
		},
		navbar: {
			transparentMode: "semi",
			blur: 5,
		},
		waves: {
			enable: {
				desktop: true,
				mobile: true,
			},
		},
		gradient: {
			enable: {
				desktop: true,
				mobile: true,
			},
			height: "10%",
		},
		carousel: {
			enable: true,
			interval: 7000,
			transitionEffect: "kenburns",
		},
	},
	banner: {
		position: "0% 20%",
	},
	overlay: {
		zIndex: -1,
		opacity: 0.8,
		blur: 10,
		cardOpacity: 0.5,
	},
	fullscreen: {
		position: "center",
	},
};
