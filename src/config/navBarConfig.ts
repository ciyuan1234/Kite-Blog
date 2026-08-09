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
			name: "Posts",
			url: "#",
			icon: "material-symbols:article",
			children: [LinkPresets.Archive, LinkPresets.Categories, LinkPresets.Tags],
		},
		{
			name: "Community",
			url: "#",
			icon: "material-symbols:group",
			children: [LinkPresets.Friends, LinkPresets.Guestbook],
		},
		{
			name: "Studio",
			url: "#",
			icon: "material-symbols:person",
			children: [LinkPresets.Dynamic, LinkPresets.Gallery],
		},
		{
			name: "About",
			url: "#",
			icon: "material-symbols:info",
			children: [LinkPresets.About],
		},
		{
			name: "Links",
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
		name: "Home",
		url: "/",
		icon: "material-symbols:home",
	},
	Dynamic: {
		name: "Moments",
		url: "/dynamic/",
		icon: "material-symbols:forum-rounded",
		pageKey: "dynamic",
	},
	Archive: {
		name: "Archive",
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	Categories: {
		name: "Categories",
		url: "/categories/",
		icon: "material-symbols:folder-open-rounded",
	},
	Tags: {
		name: "Tags",
		url: "/tags/",
		icon: "material-symbols:tag-rounded",
	},
	Friends: {
		name: "Friends",
		url: "/friends/",
		icon: "material-symbols:link-2-rounded",
		pageKey: "friends",
	},
	Sponsor: {
		name: "Sponsor",
		url: "/sponsor/",
		icon: "material-symbols:favorite",
		pageKey: "sponsor",
	},
	Guestbook: {
		name: "Guestbook",
		url: "/guestbook/",
		icon: "material-symbols:chat",
		pageKey: "guestbook",
	},
	About: {
		name: "About",
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
		name: "Gallery",
		url: "/gallery/",
		icon: "material-symbols:photo-library",
		pageKey: "gallery",
	},
	Anime: {
		name: "Anime",
		url: "/anime/",
		icon: "material-symbols:live-tv",
		pageKey: "anime",
	},
	Booknav: {
		name: "Bookmarks",
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
