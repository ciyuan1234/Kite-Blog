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
	body?: string;
};

type SiteSettingsInput = {
	siteTitle?: string;
	siteSubtitle?: string;
	profileName?: string;
	profileBio?: string;
	avatarUrl?: string;
	githubUrl?: string;
	wallpaperMode?: "banner" | "fullscreen" | "overlay" | "none";
	desktopBackgroundUrl?: string[] | string;
	mobileBackgroundUrl?: string[] | string;
	heroTitle?: string;
	heroSubtitles?: string[] | string;
	playerUrl?: string;
	playerEnable?: boolean;
	dimOpacity?: number | string;
	carouselEnable?: boolean;
};

const SESSION_COOKIE = "kite_admin_session";
const STATE_COOKIE = "kite_oauth_state";
const POST_DIR = "src/content/posts";
const PROFILE_CONFIG_PATH = "src/config/profileConfig.ts";
const WALLPAPER_CONFIG_PATH = "src/config/backgroundWallpaper.ts";
const SITE_CONFIG_PATH = "src/config/siteConfig.ts";
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
		body,
	};
}

function buildMarkdown(input: ReturnType<typeof normalizePostInput>) {
	return `---
title: ${yamlString(input.title)}
published: ${input.published}
description: ${yamlString(input.description)}
tags: [${input.tags.map(yamlString).join(", ")}]
category: ${yamlString(input.category)}
image: ${yamlString(input.image)}
slug: ${yamlString(input.slug)}
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
	return {
		title: read("title"),
		published: read("published"),
		description: read("description"),
		tags,
		category: read("category"),
		image: read("image"),
		slug: sanitizeSlug(read("slug")),
		body: body.trim(),
	};
}

function normalizeSiteSettings(input: SiteSettingsInput) {
	const desktopBackgroundUrl = normalizeList(input.desktopBackgroundUrl, 10);
	const mobileBackgroundUrl = normalizeList(
		input.mobileBackgroundUrl || input.desktopBackgroundUrl,
		10,
	);
	const playerUrl = cleanText(input.playerUrl, "", 2048);
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
		wallpaperMode: ["banner", "fullscreen", "overlay", "none"].includes(
			String(input.wallpaperMode),
		)
			? input.wallpaperMode
			: "banner",
		desktopBackgroundUrl,
		mobileBackgroundUrl: mobileBackgroundUrl.length
			? mobileBackgroundUrl
			: desktopBackgroundUrl,
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
		wallpaperMode: firstStringMatch(
			wallpaperSource,
			/\bmode:\s*"(banner|fullscreen|overlay|none)"/,
			"banner",
		) as SiteSettingsInput["wallpaperMode"],
		desktopBackgroundUrl: extractConfigValue(wallpaperSource, "desktop"),
		mobileBackgroundUrl: extractConfigValue(wallpaperSource, "mobile"),
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
\t\t{
\t\t\tname: "GitHub",
\t\t\ticon: "fa7-brands:github",
\t\t\turl: ${tsString(settings.githubUrl)},
\t\t\tshowName: false,
\t\t},
\t\t{
\t\t\tname: "RSS",
\t\t\ticon: "fa7-solid:rss",
\t\t\turl: "/rss/",
\t\t\tshowName: false,
\t\t},
\t],
};
`;
}

function buildWallpaperConfig(
	settings: ReturnType<typeof normalizeSiteSettings>,
) {
	const desktop = settings.desktopBackgroundUrl.length
		? settings.desktopBackgroundUrl
		: ["assets/images/DesktopWallpaper/d1.avif"];
	const mobile = settings.mobileBackgroundUrl.length
		? settings.mobileBackgroundUrl
		: desktop;
	const subtitles = settings.heroSubtitles.length
		? settings.heroSubtitles
		: [settings.siteSubtitle];
	return `import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";

export const backgroundWallpaper: BackgroundWallpaperConfig = {
\tmode: ${tsString(settings.wallpaperMode)} as BackgroundWallpaperConfig["mode"],
\tplayerEnable: ${settings.playerEnable},
\tsrc: {
\t\tdesktop: ${tsArray(desktop)},
\t\tmobile: ${tsArray(mobile)},
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
		throw new Error(
			payload?.message || `GitHub request failed: ${response.status}`,
		);
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
		await commitGitHubFile(
			env,
			path,
			buildMarkdown(post),
			`post: add ${post.slug}`,
		);
		return json({ ok: true, post: { ...post, path } });
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
		await commitGitHubFile(
			env,
			path,
			buildMarkdown(post),
			`post: update ${post.slug}`,
			existing.sha,
		);
		return json({ ok: true, post: { ...post, path } });
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
		const postMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
		if (postMatch)
			return await handleAdminPosts(
				request,
				env,
				decodeURIComponent(postMatch[1]),
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
