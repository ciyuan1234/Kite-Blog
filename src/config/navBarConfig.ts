import {
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/navBarConfig";

const getDynamicNavBarConfig = (): NavBarConfig => {
	const links: NavBarLink[] = [
		LinkPresets.Home,
		{
			name: "文章",
			url: "#",
			icon: "material-symbols:article",
			children: [LinkPresets.Archive, LinkPresets.Categories, LinkPresets.Tags],
		},
		{
			name: "空间",
			url: "#",
			icon: "material-symbols:person",
			children: [
				LinkPresets.Dynamic,
				LinkPresets.Gallery,
				LinkPresets.Booknav,
				LinkPresets.Admin,
			],
		},
		{
			name: "关于",
			url: "#",
			icon: "material-symbols:info",
			children: [LinkPresets.About, LinkPresets.Friends, LinkPresets.Guestbook],
		},
		{
			name: "链接",
			url: "#",
			icon: "material-symbols:link",
			children: [LinkPresets.GitHub, LinkPresets.RSS],
		},
	];

	return { links };
};

export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const LinkPresets: Record<string, NavBarLink> = {
	Home: {
		name: "首页",
		url: "/",
		icon: "material-symbols:home",
	},
	Dynamic: {
		name: "动态",
		url: "/dynamic/",
		icon: "material-symbols:forum-rounded",
		pageKey: "dynamic",
	},
	Archive: {
		name: "归档",
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	Categories: {
		name: "分类",
		url: "/categories/",
		icon: "material-symbols:folder-open-rounded",
	},
	Tags: {
		name: "标签",
		url: "/tags/",
		icon: "material-symbols:tag-rounded",
	},
	Friends: {
		name: "友链",
		url: "/friends/",
		icon: "material-symbols:link-2-rounded",
		pageKey: "friends",
	},
	Sponsor: {
		name: "赞助",
		url: "/sponsor/",
		icon: "material-symbols:favorite",
		pageKey: "sponsor",
	},
	Guestbook: {
		name: "留言",
		url: "/guestbook/",
		icon: "material-symbols:chat",
		pageKey: "guestbook",
	},
	About: {
		name: "关于",
		url: "/about/",
		icon: "material-symbols:person",
	},
	Bangumi: {
		name: "Bangumi",
		url: "/bangumi/",
		icon: "material-symbols:movie",
		pageKey: "bangumi",
	},
	Gallery: {
		name: "相册",
		url: "/gallery/",
		icon: "material-symbols:photo-library",
		pageKey: "gallery",
	},
	Admin: {
		name: "后台",
		url: "/admin/",
		icon: "material-symbols:admin-panel-settings-outline-rounded",
	},
	Anime: {
		name: "追番",
		url: "/anime/",
		icon: "material-symbols:live-tv",
		pageKey: "anime",
	},
	Booknav: {
		name: "书签",
		url: "/booknav/",
		icon: "material-symbols:bookmarks",
		pageKey: "booknav",
	},
	RSS: {
		name: "RSS",
		url: "/rss/",
		icon: "fa7-solid:rss",
	},
	GitHub: {
		name: "GitHub",
		url: "https://github.com/ciyuan1234",
		external: true,
		icon: "fa7-brands:github",
	},
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
