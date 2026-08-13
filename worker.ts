type Env = {
	ASSETS: {
		fetch: (request: Request) => Promise<Response>;
	};
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	GITHUB_REPO_TOKEN?: string;
	GITHUB_REPO_OWNER?: string;
	GITHUB_REPO_NAME?: string;
	GITHUB_REPO_BRANCH?: string;
	ADMIN_GITHUB_LOGIN?: string;
	SESSION_SECRET?: string;
	PUBLIC_SITE_URL?: string;
};

type GitHubUser = {
	id: number;
	login: string;
	name?: string;
	avatar_url?: string;
};

type AdminSession = {
	id: number;
	login: string;
	name: string;
	avatarUrl: string;
	exp: number;
};

type GitHubContentFile = {
	name: string;
	path: string;
	sha: string;
	type: string;
	content?: string;
	encoding?: string;
};

type PostInput = {
	title?: string;
	slug?: string;
	published?: string;
	category?: string;
	tags?: string[] | string;
	description?: string;
	image?: string;
	draft?: boolean;
	pinned?: boolean;
	body?: string;
};

type SiteSettingsInput = {
	siteTitle?: string;
	siteSubtitle?: string;
	profileName?: string;
	profileBio?: string;
	avatarUrl?: string;
	githubUrl?: string;
	qqUrl?: string;
	links?: AdminLinkInput[];
	wallpaperMode?: "banner" | "fullscreen" | "overlay" | "none";
	backgroundUrl?: string[] | string;
	heroTitle?: string;
	heroSubtitles?: string[] | string;
	playerUrl?: string;
	playerEnable?: boolean;
	dimOpacity?: number | string;
	carouselEnable?: boolean;
};

type AdminLinkInput = {
	name?: string;
	icon?: string;
	url?: string;
	showName?: boolean;
};

type FriendInput = {
	title?: string;
	imgurl?: string;
	desc?: string;
	siteurl?: string;
	tags?: string[] | string;
	weight?: number | string;
	enabled?: boolean;
};

const SESSION_COOKIE = "kite_admin_session";
const STATE_COOKIE = "kite_oauth_state";
const POST_DIR = "src/content/posts";
const UPLOAD_DIR = "public/uploads";
const PROFILE_CONFIG_PATH = "src/config/profileConfig.ts";
const WALLPAPER_CONFIG_PATH = "src/config/backgroundWallpaper.ts";
const SITE_CONFIG_PATH = "src/config/siteConfig.ts";
const FRIENDS_CONFIG_PATH = "src/config/friendsConfig.ts";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const jsonHeaders = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
};

function json(data: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			...jsonHeaders,
			...(init.headers || {}),
		},
	});
}

function redirect(location: string, headers: HeadersInit = {}) {
	return new Response(null, {
		status: 302,
		headers: {
			Location: location,
			...headers,
		},
	});
}

function repoConfig(env: Env) {
	return {
		owner: env.GITHUB_REPO_OWNER || "ciyuan1234",
		repo: env.GITHUB_REPO_NAME || "Kite-Blog",
		branch: env.GITHUB_REPO_BRANCH || "main",
		adminLogin: env.ADMIN_GITHUB_LOGIN || "ciyuan1234",
	};
}

function getRequiredEnv(env: Env, key: keyof Env) {
	const value = env[key];
	if (!value)
		throw new Error(`Missing Cloudflare environment variable: ${key}`);
	return String(value);
}

function base64UrlEncode(value: string) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
	const padded = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return new TextDecoder().decode(bytes);
}

function utf8ToBase64(value: string) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToUtf8(value: string) {
	const binary = atob(value.replace(/\n/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(value: ArrayBuffer) {
	const bytes = new Uint8Array(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function getCookie(request: Request, name: string) {
	const cookie = request.headers.get("Cookie") || "";
	const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : "";
}

function cookie(name: string, value: string, maxAge: number) {
	const secure = "Secure";
	return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; ${secure}`;
}

async function hmac(secret: string, value: string) {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(value),
	);
	let binary = "";
	for (const byte of new Uint8Array(signature))
		binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

async function signSession(env: Env, session: AdminSession) {
	const secret = getRequiredEnv(env, "SESSION_SECRET");
	const payload = base64UrlEncode(JSON.stringify(session));
	const signature = await hmac(secret, payload);
	return `${payload}.${signature}`;
}

async function readSession(request: Request, env: Env) {
	const raw = getCookie(request, SESSION_COOKIE);
	if (!raw?.includes(".")) return null;
	const [payload, signature] = raw.split(".");
	const expected = await hmac(getRequiredEnv(env, "SESSION_SECRET"), payload);
	if (signature !== expected) return null;
	const session = JSON.parse(base64UrlDecode(payload)) as AdminSession;
	if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
	return session;
}

async function requireSession(request: Request, env: Env) {
	const session = await readSession(request, env);
	if (!session) return null;
	const { adminLogin } = repoConfig(env);
	return session.login === adminLogin ? session : null;
}

function sanitizeSlug(value: string) {
	return (
		String(value || "")
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 96) || "untitled"
	);
}

function sanitizeFileName(value: string) {
	const parts = String(value || "image")
		.replace(/\\/g, "/")
		.split("/");
	const name = parts[parts.length - 1] || "image";
	const dot = name.lastIndexOf(".");
	const base = (dot >= 0 ? name.slice(0, dot) : name)
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
	const ext = (dot >= 0 ? name.slice(dot + 1) : "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 8);
	return `${base || "image"}${ext ? `.${ext}` : ""}`;
}

function isAllowedImage(fileName: string, type = "") {
	const extension = fileName.split(".").pop()?.toLowerCase() || "";
	return (
		["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension) ||
		[
			"image/png",
			"image/jpeg",
			"image/webp",
			"image/gif",
			"image/avif",
		].includes(type)
	);
}

function uploadPath(slug: string, fileName: string) {
	const now = new Date();
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	return `${UPLOAD_DIR}/${year}/${month}/${sanitizeSlug(slug)}/${sanitizeFileName(fileName)}`;
}

function postPath(slug: string) {
	return `${POST_DIR}/${sanitizeSlug(slug)}.md`;
}

function cleanText(value: unknown, fallback = "", maxLength = 240) {
	return String(value || fallback)
		.trim()
		.slice(0, maxLength);
}

function normalizeTags(value: unknown) {
	const raw = Array.isArray(value) ? value : String(value || "").split(",");
	return raw
		.map((tag) => cleanText(tag, "", 40))
		.filter(Boolean)
		.slice(0, 12);
}

function yamlString(value: unknown) {
	return JSON.stringify(String(value || ""));
}

function tsString(value: unknown) {
	return JSON.stringify(String(value || ""));
}

function clampNumber(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
) {
	const number = Number(value);
	if (!Number.isFinite(number)) return fallback;
	return Math.min(max, Math.max(min, number));
}

function booleanValue(value: unknown, fallback = false) {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return fallback;
}

function normalizeList(value: unknown, maxItems = 12) {
	const raw = Array.isArray(value)
		? value
		: String(value || "").split(/\r?\n|,/);
	return raw
		.map((item) => cleanText(item, "", 2048))
		.filter(Boolean)
		.slice(0, maxItems);
}

function firstStringMatch(source: string, pattern: RegExp, fallback = "") {
	const match = source.match(pattern);
	return match ? match[1] : fallback;
}

function allQuotedStrings(value: string) {
	return Array.from(value.matchAll(/"([^"]*)"/g), (match) => match[1]).filter(
		Boolean,
	);
}

function extractConfigValue(source: string, key: string) {
	const match = source.match(
		new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\]|"[^"]*")`),
	);
	if (!match) return [];
	return allQuotedStrings(match[1]);
}

function extractArrayBlock(source: string, key: string) {
	const start = source.indexOf(`${key}: [`);
	if (start < 0) return "";
	const bracketStart = source.indexOf("[", start);
	let depth = 0;
	for (let index = bracketStart; index < source.length; index++) {
		const char = source[index];
		if (char === "[") depth++;
		if (char === "]") depth--;
		if (depth === 0) return source.slice(bracketStart, index + 1);
	}
	return "";
}

function extractObjects(arraySource: string) {
	const objects: string[] = [];
	let depth = 0;
	let start = -1;
	for (let index = 0; index < arraySource.length; index++) {
		const char = arraySource[index];
		if (char === "{") {
			if (depth === 0) start = index;
			depth++;
		}
		if (char === "}") {
			depth--;
			if (depth === 0 && start >= 0)
				objects.push(arraySource.slice(start, index + 1));
		}
	}
	return objects;
}

function propString(source: string, key: string, fallback = "") {
	return firstStringMatch(
		source,
		new RegExp(`\\b${key}:\\s*"([^"]*)"`),
		fallback,
	);
}

function propBoolean(source: string, key: string, fallback = false) {
	const value = firstStringMatch(
		source,
		new RegExp(`\\b${key}:\\s*(true|false)`),
		String(fallback),
	);
	return value === "true";
}

function propNumber(source: string, key: string, fallback = 0) {
	const value = Number(
		firstStringMatch(
			source,
			new RegExp(`\\b${key}:\\s*(-?\\d+)`),
			String(fallback),
		),
	);
	return Number.isFinite(value) ? value : fallback;
}

function propArray(source: string, key: string) {
	const match = source.match(new RegExp(`\\b${key}:\\s*(\\[[\\s\\S]*?\\])`));
	return match ? allQuotedStrings(match[1]) : [];
}

function normalizeAdminLinks(value: unknown) {
	const raw = Array.isArray(value) ? value : [];
	const links = raw
		.map((item) => item as AdminLinkInput)
		.map((item) => ({
			name: cleanText(item.name, "", 40),
			icon: cleanText(item.icon, "material-symbols:link-rounded", 120),
			url: cleanText(item.url, "", 2048),
			showName: booleanValue(item.showName, false),
		}))
		.filter((item) => item.name && item.url)
		.slice(0, 12);
	return links.length
		? links
		: [
				{
					name: "GitHub",
					icon: "fa7-brands:github",
					url: "https://github.com/ciyuan1234",
					showName: false,
				},
				{ name: "RSS", icon: "fa7-solid:rss", url: "/rss/", showName: false },
			];
}

function parseProfileLinks(profileSource: string) {
	return normalizeAdminLinks(
		extractObjects(extractArrayBlock(profileSource, "links")).map((item) => ({
			name: propString(item, "name"),
			icon: propString(item, "icon"),
			url: propString(item, "url"),
			showName: propBoolean(item, "showName", false),
		})),
	);
}

function tsLinks(values: ReturnType<typeof normalizeAdminLinks>) {
	return values
		.map(
			(item) =>
				`\t\t{\n\t\t\tname: ${tsString(item.name)},\n\t\t\ticon: ${tsString(item.icon)},\n\t\t\turl: ${tsString(item.url)},\n\t\t\tshowName: ${item.showName},\n\t\t}`,
		)
		.join(",\n");
}

function normalizeFriends(value: unknown) {
	const raw = Array.isArray(value) ? value : [];
	return raw
		.map((item) => item as FriendInput)
		.map((item) => ({
			title: cleanText(item.title, "", 80),
			imgurl: cleanText(item.imgurl, "", 2048),
			desc: cleanText(item.desc, "", 180),
			siteurl: cleanText(item.siteurl, "", 2048),
			tags: normalizeTags(item.tags),
			weight: clampNumber(item.weight, 0, -9999, 9999),
			enabled: booleanValue(item.enabled, true),
		}))
		.filter((item) => item.title && item.siteurl)
		.slice(0, 80);
}

function parseFriends(source: string) {
	return normalizeFriends(
		extractObjects(extractArrayBlock(source, "friendsConfig")).map((item) => ({
			title: propString(item, "title"),
			imgurl: propString(item, "imgurl"),
			desc: propString(item, "desc"),
			siteurl: propString(item, "siteurl"),
			tags: propArray(item, "tags"),
			weight: propNumber(item, "weight", 0),
			enabled: propBoolean(item, "enabled", true),
		})),
	);
}

function buildFriendsConfig(friends: ReturnType<typeof normalizeFriends>) {
	const friendItems = friends
		.map(
			(item) =>
				`\t{\n\t\ttitle: ${tsString(item.title)},\n\t\timgurl: ${tsString(item.imgurl)},\n\t\tdesc: ${tsString(item.desc)},\n\t\tsiteurl: ${tsString(item.siteurl)},\n\t\ttags: ${JSON.stringify(item.tags)},\n\t\tweight: ${item.weight},\n\t\tenabled: ${item.enabled},\n\t}`,
		)
		.join(",\n");
	return `import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

export const friendsPageConfig: FriendsPageConfig = {
\ttitle: "",
\tdescription: "",
\tshowCustomContent: true,
\tshowComment: true,
\trandomizeSort: false,
};

export const friendsConfig: FriendLink[] = [
${friendItems}
];

export const getEnabledFriends = (): FriendLink[] => {
\tconst friends = friendsConfig.filter((friend) => friend.enabled);

\tif (friendsPageConfig.randomizeSort) {
\t\treturn friends.sort(() => Math.random() - 0.5);
\t}

\treturn friends.sort((a, b) => b.weight - a.weight);
};
`;
}

function normalizePostInput(input: PostInput) {
	const title = cleanText(input.title, "未命名文章", 160);
	const slug = sanitizeSlug(input.slug || title);
	const published = /^\d{4}-\d{2}-\d{2}$/.test(String(input.published || ""))
		? String(input.published)
		: new Date().toISOString().slice(0, 10);
	const body = String(input.body || "").trim();
	return {
		title,
		slug,
		published,
		category: cleanText(input.category, "随笔", 80),
		tags: normalizeTags(input.tags),
		description: cleanText(input.description, "", 360),
		image: cleanText(input.image, "", 2048),
		draft: input.draft === true,
		pinned: input.pinned === true,
		body,
	};
}

function buildMarkdown(input: ReturnType<typeof normalizePostInput>) {
	const flags = [
		input.draft ? "draft: true\n" : "",
		input.pinned ? "pinned: true\n" : "",
	].join("");
	return `---
title: ${yamlString(input.title)}
published: ${input.published}
description: ${yamlString(input.description)}
tags: [${input.tags.map(yamlString).join(", ")}]
category: ${yamlString(input.category)}
image: ${yamlString(input.image)}
${flags}slug: ${yamlString(input.slug)}
---

${input.body}
`;
}

function parseFrontmatter(markdown: string) {
	const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	const meta = frontmatter ? frontmatter[1] : "";
	const body = frontmatter ? frontmatter[2] : markdown;
	const read = (key: string) => {
		const match = meta.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
		return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
	};
	const tagsMatch = meta.match(/^tags:\s*\[([\s\S]*?)\]$/m);
	const tags = tagsMatch
		? tagsMatch[1]
				.split(",")
				.map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
				.filter(Boolean)
		: [];
	const readBool = (key: string) =>
		meta.match(new RegExp(`^${key}:\\s*(true|false)\\b`, "m"))?.[1] === "true";
	return {
		title: read("title"),
		published: read("published"),
		description: read("description"),
		tags,
		category: read("category"),
		image: read("image"),
		slug: sanitizeSlug(read("slug")),
		draft: readBool("draft"),
		pinned: readBool("pinned"),
		body: body.trim(),
	};
}

function normalizeSiteSettings(input: SiteSettingsInput) {
	const backgroundUrl = normalizeList(input.backgroundUrl, 10);
	const playerUrl = cleanText(input.playerUrl, "", 2048);
	const links = normalizeAdminLinks(
		(input as SiteSettingsInput & { links?: unknown }).links,
	);
	const hasExplicitLinks = Array.isArray(
		(input as SiteSettingsInput & { links?: unknown }).links,
	);
	const nextLinks = hasExplicitLinks
		? links
		: normalizeAdminLinks([
				{
					name: "GitHub",
					icon: "fa7-brands:github",
					url: cleanText(
						input.githubUrl,
						"https://github.com/ciyuan1234",
						2048,
					),
					showName: false,
				},
				...(cleanText(input.qqUrl, "", 2048)
					? [
							{
								name: "QQ",
								icon: "fa7-brands:qq",
								url: cleanText(input.qqUrl, "", 2048),
								showName: false,
							},
						]
					: []),
				{ name: "RSS", icon: "fa7-solid:rss", url: "/rss/", showName: false },
			]);
	return {
		siteTitle: cleanText(input.siteTitle, "KiteBlog", 80),
		siteSubtitle: cleanText(
			input.siteSubtitle,
			"记录技术、生活、项目与长期思考。",
			180,
		),
		profileName: cleanText(input.profileName, "Kite", 80),
		profileBio: cleanText(
			input.profileBio,
			"写技术、项目、生活和一些长期问题。",
			240,
		),
		avatarUrl: cleanText(input.avatarUrl, "assets/images/avatar.avif", 2048),
		githubUrl: cleanText(
			input.githubUrl,
			"https://github.com/ciyuan1234",
			2048,
		),
		qqUrl: cleanText(input.qqUrl, "", 2048),
		links: nextLinks,
		wallpaperMode: ["banner", "fullscreen", "overlay", "none"].includes(
			String(input.wallpaperMode),
		)
			? input.wallpaperMode
			: "banner",
		backgroundUrl,
		heroTitle: cleanText(input.heroTitle, "KiteBlog", 100),
		heroSubtitles: normalizeList(input.heroSubtitles, 8),
		playerUrl,
		playerEnable: booleanValue(input.playerEnable, false) && !!playerUrl,
		dimOpacity: clampNumber(input.dimOpacity, 0.2, 0, 0.85),
		carouselEnable: booleanValue(input.carouselEnable, true),
	};
}

function parseSiteSettings(
	profileSource: string,
	wallpaperSource: string,
	siteSource: string,
) {
	return normalizeSiteSettings({
		siteTitle: firstStringMatch(siteSource, /\btitle:\s*"([^"]*)"/),
		siteSubtitle: firstStringMatch(siteSource, /\bsubtitle:\s*"([^"]*)"/),
		profileName: firstStringMatch(profileSource, /\bname:\s*"([^"]*)"/),
		profileBio: firstStringMatch(profileSource, /\bbio:\s*"([^"]*)"/),
		avatarUrl: firstStringMatch(profileSource, /\bavatar:\s*"([^"]*)"/),
		githubUrl: firstStringMatch(
			profileSource,
			/\bname:\s*"GitHub"[\s\S]*?\burl:\s*"([^"]*)"/,
			"https://github.com/ciyuan1234",
		),
		qqUrl: firstStringMatch(
			profileSource,
			/\bname:\s*"QQ"[\s\S]*?\burl:\s*"([^"]*)"/,
			"",
		),
		links: parseProfileLinks(profileSource),
		wallpaperMode: firstStringMatch(
			wallpaperSource,
			/\bmode:\s*"(banner|fullscreen|overlay|none)"/,
			"banner",
		) as SiteSettingsInput["wallpaperMode"],
		backgroundUrl: extractConfigValue(wallpaperSource, "desktop"),
		heroTitle: firstStringMatch(wallpaperSource, /\btitle:\s*"([^"]*)"/),
		heroSubtitles: extractConfigValue(wallpaperSource, "subtitle"),
		playerUrl: firstStringMatch(wallpaperSource, /\bplayerUrl:\s*"([^"]*)"/),
		playerEnable:
			firstStringMatch(wallpaperSource, /\bplayerEnable:\s*(true|false)/) ===
			"true",
		dimOpacity: firstStringMatch(wallpaperSource, /\bdimOpacity:\s*([0-9.]+)/),
		carouselEnable:
			firstStringMatch(
				wallpaperSource,
				/\bcarousel:\s*\{[\s\S]*?\benable:\s*(true|false)/,
				"true",
			) !== "false",
	});
}

function tsArray(values: string[]) {
	if (!values.length) return "[]";
	return `[\n\t\t\t${values.map(tsString).join(",\n\t\t\t")},\n\t\t]`;
}

function buildProfileConfig(
	settings: ReturnType<typeof normalizeSiteSettings>,
) {
	return `import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
\tavatar: ${tsString(settings.avatarUrl)},
\tname: ${tsString(settings.profileName)},
\tbio: ${tsString(settings.profileBio)},
\tlinks: [
${tsLinks(settings.links)}
\t],
};
`;
}

function buildWallpaperConfig(
	settings: ReturnType<typeof normalizeSiteSettings>,
) {
	const backgroundUrl = settings.backgroundUrl.length
		? settings.backgroundUrl
		: ["assets/images/DesktopWallpaper/d1.avif"];
	const subtitles = settings.heroSubtitles.length
		? settings.heroSubtitles
		: [settings.siteSubtitle];
	return `import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";

export const backgroundWallpaper: BackgroundWallpaperConfig = {
\tmode: ${tsString(settings.wallpaperMode)} as BackgroundWallpaperConfig["mode"],
\tplayerEnable: ${settings.playerEnable},
\tsrc: {
\t\tdesktop: ${tsArray(backgroundUrl)},
\t\tmobile: ${tsArray(backgroundUrl)},
\t\tplayerUrl: ${tsString(settings.playerUrl)},
\t},
\tcommon: {
\t\tdimOpacity: ${settings.dimOpacity},
\t\tplayerMode: "random",
\t\thomeText: {
\t\t\tenable: true,
\t\t\ttitle: ${tsString(settings.heroTitle)},
\t\t\ttitleSize: "4.5rem",
\t\t\tsubtitle: ${tsArray(subtitles)},
\t\t\tsubtitleSize: "1.5rem",
\t\t\ttypewriter: {
\t\t\t\tenable: true,
\t\t\t\tspeed: 70,
\t\t\t\tdeleteSpeed: 35,
\t\t\t\tpauseTime: 2000,
\t\t\t},
\t\t},
\t\tpostInfo: {
\t\t\tmode: "description",
\t\t},
\t\tnavbar: {
\t\t\ttransparentMode: "semi",
\t\t\tblur: 5,
\t\t},
\t\twaves: {
\t\t\tenable: {
\t\t\t\tdesktop: true,
\t\t\t\tmobile: true,
\t\t\t},
\t\t},
\t\tgradient: {
\t\t\tenable: {
\t\t\t\tdesktop: true,
\t\t\t\tmobile: true,
\t\t\t},
\t\t\theight: "10%",
\t\t},
\t\tcarousel: {
\t\t\tenable: ${settings.carouselEnable},
\t\t\tinterval: 7000,
\t\t\ttransitionEffect: "kenburns",
\t\t},
\t},
\tbanner: {
\t\tposition: "0% 20%",
\t},
\toverlay: {
\t\tzIndex: -1,
\t\topacity: 0.8,
\t\tblur: 10,
\t\tcardOpacity: 0.5,
\t},
\tfullscreen: {
\t\tposition: "center",
\t},
};
`;
}

function patchSiteConfig(
	source: string,
	settings: ReturnType<typeof normalizeSiteSettings>,
) {
	let next = source.replace(
		/(\btitle:\s*)"[^"]*"/,
		`$1${tsString(settings.siteTitle)}`,
	);
	next = next.replace(
		/(\bsubtitle:\s*)"[^"]*"/,
		`$1${tsString(settings.siteSubtitle)}`,
	);
	next = next.replace(
		/(navbar:\s*\{[\s\S]*?\btitle:\s*)"[^"]*"/,
		`$1${tsString(settings.siteTitle)}`,
	);
	return next;
}

function githubHeaders(env: Env, accept = "application/vnd.github+json") {
	return {
		Accept: accept,
		Authorization: `Bearer ${getRequiredEnv(env, "GITHUB_REPO_TOKEN")}`,
		"User-Agent": "KiteBlog-Admin",
		"X-GitHub-Api-Version": "2022-11-28",
	};
}

function encodeRepoPath(path: string) {
	return path.split("/").map(encodeURIComponent).join("/");
}

async function githubFetch(env: Env, path: string, init: RequestInit = {}) {
	const response = await fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			...githubHeaders(env),
			...(init.headers || {}),
		},
	});
	const text = await response.text();
	const payload = text ? JSON.parse(text) : null;
	if (!response.ok) {
		const message = String(
			payload?.message || `GitHub request failed: ${response.status}`,
		);
		if (message.includes("Resource not accessible by personal access token")) {
			throw new Error(
				"GITHUB_REPO_TOKEN 没有仓库内容读写权限。请在 GitHub 重新生成 token，并给 ciyuan1234/Kite-Blog 设置 Contents: Read and write。",
			);
		}
		if (response.status === 401 || response.status === 403) {
			throw new Error(
				`GitHub API 权限不足：${message}。请检查 Cloudflare Secret 里的 GITHUB_REPO_TOKEN。`,
			);
		}
		throw new Error(message);
	}
	return payload;
}

async function getGitHubFile(env: Env, path: string) {
	const { owner, repo, branch } = repoConfig(env);
	const payload = await githubFetch(
		env,
		`/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(branch)}`,
	);
	if (Array.isArray(payload) || payload.type !== "file") {
		throw new Error("GitHub path is not a file.");
	}
	return {
		path: payload.path as string,
		sha: payload.sha as string,
		content: base64ToUtf8(payload.content || ""),
	};
}

async function maybeGetGitHubFile(env: Env, path: string) {
	try {
		return await getGitHubFile(env, path);
	} catch (error) {
		if (String((error as Error).message).includes("Not Found")) return null;
		throw error;
	}
}

async function listGitHubPostFiles(env: Env) {
	const { owner, repo, branch } = repoConfig(env);
	const payload = await githubFetch(
		env,
		`/repos/${owner}/${repo}/contents/${encodeRepoPath(POST_DIR)}?ref=${encodeURIComponent(branch)}`,
	);
	if (!Array.isArray(payload)) return [];
	return payload.filter(
		(item: GitHubContentFile) =>
			item.type === "file" && /\.(md|mdx)$/i.test(item.name),
	) as GitHubContentFile[];
}

async function commitGitHubFile(
	env: Env,
	path: string,
	content: string,
	message: string,
	sha?: string,
) {
	const { owner, repo, branch } = repoConfig(env);
	return githubFetch(
		env,
		`/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`,
		{
			method: "PUT",
			body: JSON.stringify({
				message,
				content: utf8ToBase64(content),
				branch,
				...(sha ? { sha } : {}),
			}),
		},
	);
}

async function commitGitHubBase64File(
	env: Env,
	path: string,
	content: string,
	message: string,
	sha?: string,
) {
	const { owner, repo, branch } = repoConfig(env);
	return githubFetch(
		env,
		`/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`,
		{
			method: "PUT",
			body: JSON.stringify({
				message,
				content,
				branch,
				...(sha ? { sha } : {}),
			}),
		},
	);
}

async function deleteGitHubFile(
	env: Env,
	path: string,
	sha: string,
	message: string,
) {
	const { owner, repo, branch } = repoConfig(env);
	return githubFetch(
		env,
		`/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`,
		{
			method: "DELETE",
			body: JSON.stringify({ message, sha, branch }),
		},
	);
}

async function handleOAuthStart(request: Request, env: Env) {
	const clientId = getRequiredEnv(env, "GITHUB_CLIENT_ID");
	getRequiredEnv(env, "GITHUB_CLIENT_SECRET");
	getRequiredEnv(env, "SESSION_SECRET");
	const origin = env.PUBLIC_SITE_URL || new URL(request.url).origin;
	const state = crypto.randomUUID();
	const authUrl = new URL("https://github.com/login/oauth/authorize");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set(
		"redirect_uri",
		`${origin}/api/auth/github/callback`,
	);
	authUrl.searchParams.set("scope", "read:user");
	authUrl.searchParams.set("state", state);
	return redirect(authUrl.toString(), {
		"Set-Cookie": cookie(STATE_COOKIE, state, 600),
	});
}

async function handleOAuthCallback(request: Request, env: Env) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code") || "";
	const state = url.searchParams.get("state") || "";
	if (!code || !state || state !== getCookie(request, STATE_COOKIE)) {
		return redirect("/admin/?error=oauth_state");
	}

	const origin = env.PUBLIC_SITE_URL || url.origin;
	const tokenResponse = await fetch(
		"https://github.com/login/oauth/access_token",
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: getRequiredEnv(env, "GITHUB_CLIENT_ID"),
				client_secret: getRequiredEnv(env, "GITHUB_CLIENT_SECRET"),
				code,
				redirect_uri: `${origin}/api/auth/github/callback`,
			}),
		},
	);
	const tokenPayload = (await tokenResponse.json()) as {
		access_token?: string;
		error_description?: string;
	};
	if (!tokenResponse.ok || !tokenPayload.access_token) {
		return redirect(
			`/admin/?error=${encodeURIComponent(tokenPayload.error_description || "oauth_token")}`,
		);
	}

	const userResponse = await fetch("https://api.github.com/user", {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${tokenPayload.access_token}`,
			"User-Agent": "KiteBlog-Admin",
		},
	});
	const user = (await userResponse.json()) as GitHubUser;
	const { adminLogin } = repoConfig(env);
	if (!userResponse.ok || user.login !== adminLogin) {
		return redirect("/admin/?error=forbidden");
	}

	const session: AdminSession = {
		id: user.id,
		login: user.login,
		name: user.name || user.login,
		avatarUrl: user.avatar_url || "",
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
	const headers = new Headers({ Location: "/admin/posts/" });
	headers.append(
		"Set-Cookie",
		cookie(
			SESSION_COOKIE,
			await signSession(env, session),
			SESSION_TTL_SECONDS,
		),
	);
	headers.append("Set-Cookie", cookie(STATE_COOKIE, "", 0));
	return new Response(null, { status: 302, headers });
}

async function handleSession(request: Request, env: Env) {
	const session = await requireSession(request, env);
	return json({
		ok: true,
		authenticated: !!session,
		user: session
			? {
					login: session.login,
					name: session.name,
					avatarUrl: session.avatarUrl,
				}
			: null,
	});
}

function logout() {
	return json(
		{ ok: true },
		{
			headers: {
				"Set-Cookie": cookie(SESSION_COOKIE, "", 0),
			},
		},
	);
}

const COVER_BACKUP_LIMIT = 5 * 1024 * 1024;

const COVER_EXT_BY_TYPE: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/gif": "gif",
	"image/avif": "avif",
};

async function coverBackupImage(
	env: Env,
	imageUrl: string,
	slug: string,
): Promise<{ backup: boolean; url?: string; error?: string }> {
	if (!/^https?:\/\//i.test(imageUrl)) {
		return { backup: false };
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15000);
	try {
		const response = await fetch(imageUrl, {
			redirect: "follow",
			signal: controller.signal,
		});
		if (!response.ok) {
			return { backup: false, error: `HTTP ${response.status}` };
		}
		const contentType = String(response.headers.get("content-type") || "")
			.split(";")[0]
			.trim()
			.toLowerCase();
		const ext = COVER_EXT_BY_TYPE[contentType];
		if (!ext) {
			return {
				backup: false,
				error: `不支持的图片类型 ${contentType || "未知"}`,
			};
		}
		const stated = Number(response.headers.get("content-length") || 0);
		if (stated > COVER_BACKUP_LIMIT) {
			return { backup: false, error: "图片超过 5MB" };
		}
		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > COVER_BACKUP_LIMIT) {
			return { backup: false, error: "图片超过 5MB" };
		}
		const path = uploadPath(slug, `cover.${ext}`);
		const existing = await maybeGetGitHubFile(env, path);
		if (existing) {
			return { backup: true, url: `/${path.replace(/^public\//, "")}` };
		}
		await commitGitHubBase64File(
			env,
			path,
			arrayBufferToBase64(buffer),
			`asset: backup cover for ${slug}`,
		);
		return { backup: true, url: `/${path.replace(/^public\//, "")}` };
	} catch (error) {
		const message =
			error instanceof Error && error.name === "AbortError"
				? "下载超时"
				: error instanceof Error
					? error.message
					: "未知错误";
		return { backup: false, error: message };
	} finally {
		clearTimeout(timer);
	}
}

async function handleAdminPosts(request: Request, env: Env, slug?: string) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });

	if (request.method === "GET" && !slug) {
		const files = await listGitHubPostFiles(env);
		const posts = await Promise.all(
			files.map(async (file) => {
				const full = await getGitHubFile(env, file.path);
				const parsed = parseFrontmatter(full.content);
				return {
					path: file.path,
					sha: file.sha,
					title: parsed.title || file.name.replace(/\.(md|mdx)$/i, ""),
					slug:
						parsed.slug || sanitizeSlug(file.name.replace(/\.(md|mdx)$/i, "")),
					published: parsed.published,
					category: parsed.category,
					tags: parsed.tags,
					description: parsed.description,
					image: parsed.image,
					draft: parsed.draft,
					pinned: parsed.pinned,
				};
			}),
		);
		posts.sort((a, b) =>
			String(b.published || "").localeCompare(String(a.published || "")),
		);
		return json({ ok: true, posts });
	}

	if (request.method === "GET" && slug) {
		const path = postPath(slug);
		const file = await getGitHubFile(env, path);
		const parsed = parseFrontmatter(file.content);
		return json({
			ok: true,
			post: {
				...parsed,
				path,
				sha: file.sha,
				slug: parsed.slug || sanitizeSlug(slug),
			},
		});
	}

	if (request.method === "POST" && !slug) {
		const body = (await request.json().catch(() => null)) as PostInput | null;
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const post = normalizePostInput(body);
		if (!post.title || !post.body) {
			return json(
				{ ok: false, error: "Title and body are required." },
				{ status: 400 },
			);
		}
		const path = postPath(post.slug);
		if (await maybeGetGitHubFile(env, path)) {
			return json(
				{ ok: false, error: "A post with this slug already exists." },
				{ status: 409 },
			);
		}
		const backup = await coverBackupImage(env, post.image, post.slug);
		if (backup.url) post.image = backup.url;
		await commitGitHubFile(
			env,
			path,
			buildMarkdown(post),
			`post: add ${post.slug}`,
		);
		return json({
			ok: true,
			post: { ...post, path },
			coverBackedUp: backup.backup && !!backup.url,
			coverBackupError: backup.error || null,
		});
	}

	if (request.method === "PUT" && slug) {
		const body = (await request.json().catch(() => null)) as PostInput | null;
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const post = normalizePostInput({ ...body, slug });
		if (!post.title || !post.body) {
			return json(
				{ ok: false, error: "Title and body are required." },
				{ status: 400 },
			);
		}
		const path = postPath(slug);
		const existing = await getGitHubFile(env, path);
		const backup = await coverBackupImage(env, post.image, post.slug);
		if (backup.url) post.image = backup.url;
		await commitGitHubFile(
			env,
			path,
			buildMarkdown(post),
			`post: update ${post.slug}`,
			existing.sha,
		);
		return json({
			ok: true,
			post: { ...post, path },
			coverBackedUp: backup.backup && !!backup.url,
			coverBackupError: backup.error || null,
		});
	}

	if (request.method === "DELETE" && slug) {
		const path = postPath(slug);
		const existing = await getGitHubFile(env, path);
		await deleteGitHubFile(
			env,
			path,
			existing.sha,
			`post: delete ${sanitizeSlug(slug)}`,
		);
		return json({ ok: true, slug: sanitizeSlug(slug) });
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleAdminTags(request: Request, env: Env) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });

	if (request.method === "GET") {
		const tags = tagSummary(await getPostEntries(env));
		return json({ ok: true, tags });
	}

	if (request.method === "POST") {
		const body = (await request.json().catch(() => null)) as {
			from?: string;
			to?: string;
			tag?: string;
		} | null;
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const from = cleanText(body.from, "", 80);
		const to = cleanText(body.to, "", 80);
		const tag = cleanText(body.tag, "", 80);
		if (body.from !== undefined && (!from || !to || from === to)) {
			return json(
				{ ok: false, error: "重命名需要有效的 from 和 to。" },
				{ status: 400 },
			);
		}
		if (body.tag !== undefined && !tag) {
			return json({ ok: false, error: "tag 不能为空。" }, { status: 400 });
		}

		const entries = await getPostEntries(env);
		const targets = entries.filter((entry) =>
			(entry.parsed.tags || []).includes(from),
		);
		if (body.tag !== undefined) {
			return await updateTagsAcrossPosts(
				env,
				targets.filter((entry) => (entry.parsed.tags || []).includes(tag)),
				(tags) => tags.filter((item) => item !== tag),
			);
		}
		return await updateTagsAcrossPosts(env, targets, (tags) =>
			tags.map((item) => (item === from ? to : item)),
		);
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function updateTagsAcrossPosts(
	env: Env,
	targets: Awaited<ReturnType<typeof getPostEntries>>,
	update: (tags: string[]) => string[],
) {
	const limit = 100;
	if (targets.length > limit) {
		return json(
			{ ok: false, error: `一次性最多处理 ${limit} 篇文章，请分批操作。` },
			{ status: 400 },
		);
	}
	const skipped: string[] = [];
	let updated = 0;
	for (const target of targets) {
		const rewritten = rewriteFrontmatterTags(target.content, update);
		if (!rewritten) {
			skipped.push(
				target.parsed.slug ||
					sanitizeSlug(target.name.replace(/\.(md|mdx)$/i, "")),
			);
			continue;
		}
		await commitGitHubFile(
			env,
			target.path,
			rewritten,
			`post: update tags for ${target.name.replace(/\.(md|mdx)$/i, "")}`,
			target.sha,
		);
		updated += 1;
	}
	return json({ ok: true, updated, skipped });
}

function rewriteFrontmatterTags(
	markdown: string,
	update: (tags: string[]) => string[],
) {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return null;
	const tagsMatch = match[1].match(/^tags:\s*\[([\s\S]*?)\]$/m);
	if (!tagsMatch) return null;
	const tags = tagsMatch[1]
		.split(",")
		.map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
		.filter(Boolean);
	const next = update(tags);
	const rendered = `tags: [${next.map((tag) => yamlString(tag)).join(", ")}]`;
	return markdown.replace(/^tags:\s*\[[\s\S]*?\]$/m, rendered);
}

async function handleAdminAssets(request: Request, env: Env) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });
	if (request.method !== "POST")
		return json({ ok: false, error: "Method not allowed." }, { status: 405 });

	const form = await request.formData().catch(() => null);
	const file = form?.get("file");
	const slug = cleanText(form?.get("slug"), "draft", 96);
	const requestedName = cleanText(form?.get("name"), "", 180);
	if (!(file instanceof File)) {
		return json({ ok: false, error: "没有收到图片文件。" }, { status: 400 });
	}
	if (!isAllowedImage(file.name, file.type)) {
		return json(
			{ ok: false, error: "只支持 png、jpg、jpeg、webp、gif、avif 图片。" },
			{ status: 400 },
		);
	}
	if (file.size > 5 * 1024 * 1024) {
		return json(
			{ ok: false, error: "单张图片不能超过 5MB。" },
			{ status: 400 },
		);
	}

	const safeName = sanitizeFileName(requestedName || file.name);
	const path = uploadPath(slug, safeName);
	const existing = await maybeGetGitHubFile(env, path);
	await commitGitHubBase64File(
		env,
		path,
		arrayBufferToBase64(await file.arrayBuffer()),
		`asset: upload ${safeName}`,
		existing?.sha,
	);
	return json({
		ok: true,
		path,
		url: `/${path.replace(/^public\//, "")}`,
		name: safeName,
		size: file.size,
	});
}

async function handleAdminSettings(request: Request, env: Env) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });

	const [profileFile, wallpaperFile, siteFile] = await Promise.all([
		getGitHubFile(env, PROFILE_CONFIG_PATH),
		getGitHubFile(env, WALLPAPER_CONFIG_PATH),
		getGitHubFile(env, SITE_CONFIG_PATH),
	]);

	if (request.method === "GET") {
		return json({
			ok: true,
			settings: parseSiteSettings(
				profileFile.content,
				wallpaperFile.content,
				siteFile.content,
			),
		});
	}

	if (request.method === "PUT") {
		const body = (await request
			.json()
			.catch(() => null)) as SiteSettingsInput | null;
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const settings = normalizeSiteSettings(body);
		await commitGitHubFile(
			env,
			PROFILE_CONFIG_PATH,
			buildProfileConfig(settings),
			"config: update profile settings",
			profileFile.sha,
		);
		await commitGitHubFile(
			env,
			WALLPAPER_CONFIG_PATH,
			buildWallpaperConfig(settings),
			"config: update wallpaper settings",
			wallpaperFile.sha,
		);
		await commitGitHubFile(
			env,
			SITE_CONFIG_PATH,
			patchSiteConfig(siteFile.content, settings),
			"config: update site settings",
			siteFile.sha,
		);
		return json({ ok: true, settings });
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function getPostEntries(env: Env) {
	const files = await listGitHubPostFiles(env);
	const entries = await Promise.all(
		files.map(async (file) => {
			const full = await getGitHubFile(env, file.path);
			return {
				...file,
				content: full.content,
				sha: full.sha,
				parsed: parseFrontmatter(full.content),
			};
		}),
	);
	return entries;
}

function categorySummary(entries: Awaited<ReturnType<typeof getPostEntries>>) {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const category = cleanText(entry.parsed.category, "", 80);
		if (!category) continue;
		counts.set(category, (counts.get(category) || 0) + 1);
	}
	return Array.from(counts.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function tagSummary(entries: Awaited<ReturnType<typeof getPostEntries>>) {
	const counts = new Map<
		string,
		{
			count: number;
			posts: Array<{
				slug: string;
				title: string;
				published: string;
				draft: boolean;
				pinned: boolean;
			}>;
		}
	>();
	for (const entry of entries) {
		const slug =
			entry.parsed.slug || sanitizeSlug(entry.name.replace(/\.(md|mdx)$/i, ""));
		for (const raw of entry.parsed.tags || []) {
			const name = cleanText(raw, "", 80);
			if (!name) continue;
			const item = counts.get(name) || {
				count: 0,
				posts: [],
			};
			item.count += 1;
			item.posts.push({
				slug,
				title: entry.parsed.title || slug,
				published: entry.parsed.published,
				draft: entry.parsed.draft,
				pinned: entry.parsed.pinned,
			});
			counts.set(name, item);
		}
	}
	return Array.from(counts.entries())
		.map(([name, item]) => ({
			name,
			count: item.count,
			posts: item.posts.sort((a, b) =>
				String(b.published || "").localeCompare(String(a.published || "")),
			),
		}))
		.sort(
			(a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"),
		);
}

async function handleAdminCategories(
	request: Request,
	env: Env,
	name?: string,
) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });

	const entries = await getPostEntries(env);
	if (request.method === "GET" && !name) {
		return json({ ok: true, categories: categorySummary(entries) });
	}

	if (request.method === "PUT" && name) {
		const body = (await request.json().catch(() => null)) as {
			name?: string;
		} | null;
		const oldName = cleanText(name, "", 80);
		const newName = cleanText(body?.name, "", 80);
		if (!oldName || !newName) {
			return json({ ok: false, error: "分类名称不能为空。" }, { status: 400 });
		}
		const targets = entries.filter(
			(entry) => entry.parsed.category === oldName,
		);
		await Promise.all(
			targets.map((entry) => {
				const next = buildMarkdown({ ...entry.parsed, category: newName });
				return commitGitHubFile(
					env,
					entry.path,
					next,
					`category: rename ${oldName} to ${newName}`,
					entry.sha,
				);
			}),
		);
		return json({ ok: true, updated: targets.length });
	}

	if (request.method === "DELETE" && name) {
		const oldName = cleanText(name, "", 80);
		const targets = entries.filter(
			(entry) => entry.parsed.category === oldName,
		);
		await Promise.all(
			targets.map((entry) => {
				const next = buildMarkdown({ ...entry.parsed, category: "" });
				return commitGitHubFile(
					env,
					entry.path,
					next,
					`category: clear ${oldName}`,
					entry.sha,
				);
			}),
		);
		return json({ ok: true, updated: targets.length });
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleAdminLinks(request: Request, env: Env) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });
	const [profileFile, wallpaperFile, siteFile] = await Promise.all([
		getGitHubFile(env, PROFILE_CONFIG_PATH),
		getGitHubFile(env, WALLPAPER_CONFIG_PATH),
		getGitHubFile(env, SITE_CONFIG_PATH),
	]);
	if (request.method === "GET") {
		return json({ ok: true, links: parseProfileLinks(profileFile.content) });
	}
	if (request.method === "PUT") {
		const body = (await request.json().catch(() => null)) as {
			links?: unknown;
		} | null;
		const settings = parseSiteSettings(
			profileFile.content,
			wallpaperFile.content,
			siteFile.content,
		);
		settings.links = normalizeAdminLinks(body?.links);
		await commitGitHubFile(
			env,
			PROFILE_CONFIG_PATH,
			buildProfileConfig(settings),
			"config: update profile links",
			profileFile.sha,
		);
		return json({ ok: true, links: settings.links });
	}
	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleAdminFriends(request: Request, env: Env) {
	const session = await requireSession(request, env);
	if (!session)
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });
	const file = await getGitHubFile(env, FRIENDS_CONFIG_PATH);
	if (request.method === "GET") {
		return json({ ok: true, friends: parseFriends(file.content) });
	}
	if (request.method === "PUT") {
		const body = (await request.json().catch(() => null)) as {
			friends?: unknown;
		} | null;
		const friends = normalizeFriends(body?.friends);
		await commitGitHubFile(
			env,
			FRIENDS_CONFIG_PATH,
			buildFriendsConfig(friends),
			"config: update friend links",
			file.sha,
		);
		return json({ ok: true, friends });
	}
	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleApi(request: Request, env: Env) {
	const url = new URL(request.url);
	const pathname = url.pathname.replace(/\/$/, "");
	try {
		if (pathname === "/api/kite-config") {
			if (request.method === "OPTIONS")
				return new Response(null, { status: 204 });
			if (request.method === "GET")
				return json({ ok: true, source: "default", config: null });
			return json(
				{
					ok: false,
					error:
						"Runtime config editing has been replaced by the GitHub-backed admin.",
				},
				{ status: 410 },
			);
		}
		if (pathname === "/api/auth/github/start")
			return await handleOAuthStart(request, env);
		if (pathname === "/api/auth/github/callback")
			return await handleOAuthCallback(request, env);
		if (pathname === "/api/auth/logout") return logout();
		if (pathname === "/api/admin/session")
			return await handleSession(request, env);
		if (pathname === "/api/admin/posts")
			return await handleAdminPosts(request, env);
		if (pathname === "/api/admin/settings")
			return await handleAdminSettings(request, env);
		if (pathname === "/api/admin/categories")
			return await handleAdminCategories(request, env);
		if (pathname === "/api/admin/tags")
			return await handleAdminTags(request, env);
		if (pathname === "/api/admin/links")
			return await handleAdminLinks(request, env);
		if (pathname === "/api/admin/friends")
			return await handleAdminFriends(request, env);
		if (pathname === "/api/admin/assets")
			return await handleAdminAssets(request, env);
		const postMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
		if (postMatch)
			return await handleAdminPosts(
				request,
				env,
				decodeURIComponent(postMatch[1]),
			);
		const categoryMatch = pathname.match(/^\/api\/admin\/categories\/([^/]+)$/);
		if (categoryMatch)
			return await handleAdminCategories(
				request,
				env,
				decodeURIComponent(categoryMatch[1]),
			);
		return json({ ok: false, error: "API route not found." }, { status: 404 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown server error.";
		if (pathname.startsWith("/api/auth/github/")) {
			return redirect(`/admin/?error=${encodeURIComponent(message)}`);
		}
		return json(
			{
				ok: false,
				error: message,
			},
			{ status: 500 },
		);
	}
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/api/")) {
			return handleApi(request, env);
		}
		return env.ASSETS.fetch(request);
	},
};
