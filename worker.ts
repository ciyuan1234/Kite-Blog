const CONFIG_KEY = "kiteblog:config";
const DRAFT_PREFIX = "kiteblog:draft:";
const POST_PREFIX = "kiteblog:post:";

type KVNamespaceLike = {
	get: (key: string, type?: "json") => Promise<unknown>;
	list: (options: { prefix: string; limit: number }) => Promise<{
		keys: Array<{ name: string; metadata?: unknown }>;
	}>;
	put: (
		key: string,
		value: string,
		options?: { metadata?: Record<string, string> },
	) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

type Env = {
	ASSETS: {
		fetch: (request: Request) => Promise<Response>;
	};
	KITEBLOG_KV?: KVNamespaceLike;
	KITEBLOG_ADMIN_TOKEN?: string;
};

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

function slugify(value: string, fallback = "item") {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 96) || fallback
	);
}

function cleanText(value: unknown, fallback = "", maxLength = 240) {
	return String(value || fallback)
		.trim()
		.slice(0, maxLength);
}

function getToken(request: Request) {
	const auth = request.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
	return request.headers.get("x-kiteblog-token") || "";
}

function isAuthorized(request: Request, env: Env) {
	const expected = String(env.KITEBLOG_ADMIN_TOKEN || "");
	return !!expected && getToken(request) === expected;
}

function assertKv(env: Env) {
	if (!env.KITEBLOG_KV) {
		return json(
			{
				ok: false,
				error: "Cloudflare KV binding KITEBLOG_KV is not configured.",
			},
			{ status: 501 },
		);
	}
	return null;
}

function assertWriteReady(request: Request, env: Env) {
	const kvFailure = assertKv(env);
	if (kvFailure) return kvFailure;
	if (!env.KITEBLOG_ADMIN_TOKEN) {
		return json(
			{ ok: false, error: "KITEBLOG_ADMIN_TOKEN is not configured." },
			{ status: 501 },
		);
	}
	if (!isAuthorized(request, env)) {
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });
	}
	return null;
}

function normalizeConfig(input: Record<string, unknown>) {
	const allowList = [
		"siteTitle",
		"profileName",
		"profileBio",
		"avatarUrl",
		"heroTitle",
		"heroSubtitle",
		"backgroundUrl",
		"glassStrength",
		"backgroundOpacity",
		"accentHue",
		"cardRadius",
		"cardEffect",
		"fontScale",
		"musicUrl",
	];
	const output: Record<string, string> = {};
	for (const key of allowList) {
		const value = input[key];
		if (typeof value !== "string") continue;
		output[key] = value.trim().slice(0, key.endsWith("Url") ? 2048 : 240);
	}
	output.updatedAt = new Date().toISOString();
	return output;
}

async function handleConfig(request: Request, env: Env) {
	if (request.method === "OPTIONS") return new Response(null, { status: 204 });
	const kvFailure =
		request.method === "GET" ? assertKv(env) : assertWriteReady(request, env);
	if (request.method !== "GET" && kvFailure) return kvFailure;

	const kv = env.KITEBLOG_KV;
	if (request.method === "GET") {
		if (!kv) return json({ ok: true, source: "default", config: null });
		const config = await kv.get(CONFIG_KEY, "json");
		return json({ ok: true, source: config ? "kv" : "default", config });
	}
	if (!kv) {
		return json(
			{
				ok: false,
				error: "Cloudflare KV binding KITEBLOG_KV is not configured.",
			},
			{ status: 501 },
		);
	}
	if (request.method === "PUT") {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const config = normalizeConfig(body as Record<string, unknown>);
		await kv.put(CONFIG_KEY, JSON.stringify(config));
		return json({ ok: true, source: "kv", config });
	}
	if (request.method === "DELETE") {
		await kv.delete(CONFIG_KEY);
		return json({ ok: true, source: "default", config: null });
	}
	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleDrafts(request: Request, env: Env) {
	if (request.method === "OPTIONS") return new Response(null, { status: 204 });
	const failure = assertWriteReady(request, env);
	if (failure) return failure;
	const kv = env.KITEBLOG_KV;
	if (!kv) {
		return json(
			{
				ok: false,
				error: "Cloudflare KV binding KITEBLOG_KV is not configured.",
			},
			{ status: 501 },
		);
	}
	const url = new URL(request.url);

	if (request.method === "GET") {
		const key = url.searchParams.get("key") || "";
		if (key) {
			if (!key.startsWith(DRAFT_PREFIX)) {
				return json(
					{ ok: false, error: "Invalid draft key." },
					{ status: 400 },
				);
			}
			const markdown = await kv.get(key);
			if (markdown === null) {
				return json({ ok: false, error: "Draft not found." }, { status: 404 });
			}
			return json({ ok: true, key, markdown });
		}
		const list = await kv.list({ prefix: DRAFT_PREFIX, limit: 80 });
		return json({
			ok: true,
			drafts: list.keys
				.map((item) => ({ key: item.name, metadata: item.metadata || null }))
				.sort((a, b) =>
					String(
						(b.metadata as { updatedAt?: string } | null)?.updatedAt || "",
					).localeCompare(
						String(
							(a.metadata as { updatedAt?: string } | null)?.updatedAt || "",
						),
					),
				),
		});
	}

	if (request.method === "POST") {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const data = body as Record<string, unknown>;
		const title = cleanText(data.title, "未命名草稿", 160);
		const slug = slugify(cleanText(data.slug, title, 120), "draft");
		const markdown = String(data.markdown || "")
			.trim()
			.slice(0, 200000);
		if (!markdown) {
			return json(
				{ ok: false, error: "Draft markdown is empty." },
				{ status: 400 },
			);
		}
		const now = new Date().toISOString();
		const key = `${DRAFT_PREFIX}${now.slice(0, 10)}:${slug}`;
		await kv.put(key, markdown, {
			metadata: {
				title,
				slug,
				description: cleanText(data.description, "", 240),
				category: cleanText(data.category, "随笔", 80),
				updatedAt: now,
			},
		});
		return json({ ok: true, key, updatedAt: now });
	}

	if (request.method === "DELETE") {
		const key = url.searchParams.get("key") || "";
		if (!key.startsWith(DRAFT_PREFIX)) {
			return json({ ok: false, error: "Invalid draft key." }, { status: 400 });
		}
		await kv.delete(key);
		return json({ ok: true, key });
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

function normalizePost(input: Record<string, unknown>) {
	const now = new Date().toISOString();
	const title = cleanText(input.title, "未命名文章", 160);
	const slug = slugify(cleanText(input.slug, title, 96), "post");
	const tags = Array.isArray(input.tags)
		? input.tags.map((tag) => cleanText(tag, "", 40)).filter(Boolean)
		: String(input.tags || "")
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean);
	return {
		title,
		slug,
		description: cleanText(input.description, "", 360),
		category: cleanText(input.category, "随笔", 80),
		tags: tags.slice(0, 12).join(", "),
		cover: cleanText(input.cover, "", 2048),
		publishedAt: cleanText(input.publishedAt, now, 40),
		updatedAt: now,
		markdown: String(input.markdown || "")
			.trim()
			.slice(0, 300000),
	};
}

async function handlePosts(request: Request, env: Env) {
	if (request.method === "OPTIONS") return new Response(null, { status: 204 });
	const kvFailure = assertKv(env);
	if (kvFailure) return kvFailure;
	const kv = env.KITEBLOG_KV;
	if (!kv) {
		return json(
			{
				ok: false,
				error: "Cloudflare KV binding KITEBLOG_KV is not configured.",
			},
			{ status: 501 },
		);
	}
	const url = new URL(request.url);

	if (request.method === "GET") {
		const slug = url.searchParams.get("slug") || "";
		if (slug) {
			const post = await kv.get(
				`${POST_PREFIX}${slugify(slug, "post")}`,
				"json",
			);
			if (!post) {
				return json({ ok: false, error: "Post not found." }, { status: 404 });
			}
			return json({ ok: true, post });
		}
		const list = await kv.list({ prefix: POST_PREFIX, limit: 100 });
		const posts = list.keys
			.map((item) => item.metadata || null)
			.filter(Boolean)
			.sort((a, b) =>
				String((b as { publishedAt?: string }).publishedAt || "").localeCompare(
					String((a as { publishedAt?: string }).publishedAt || ""),
				),
			);
		return json({ ok: true, posts });
	}

	const failure = assertWriteReady(request, env);
	if (failure) return failure;

	if (request.method === "POST" || request.method === "PUT") {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
		}
		const post = normalizePost(body as Record<string, unknown>);
		if (!post.markdown) {
			return json(
				{ ok: false, error: "Post markdown is empty." },
				{ status: 400 },
			);
		}
		await kv.put(`${POST_PREFIX}${post.slug}`, JSON.stringify(post), {
			metadata: {
				title: post.title,
				slug: post.slug,
				description: post.description,
				category: post.category,
				tags: post.tags,
				cover: post.cover,
				publishedAt: post.publishedAt,
				updatedAt: post.updatedAt,
			},
		});
		return json({ ok: true, post });
	}

	if (request.method === "DELETE") {
		const slug = url.searchParams.get("slug") || "";
		if (!slug) {
			return json({ ok: false, error: "Missing post slug." }, { status: 400 });
		}
		await kv.delete(`${POST_PREFIX}${slugify(slug, "post")}`);
		return json({ ok: true, slug: slugify(slug, "post") });
	}

	return json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

async function handleApi(request: Request, env: Env) {
	const pathname = new URL(request.url).pathname.replace(/\/$/, "");
	if (pathname === "/api/kite-config") return handleConfig(request, env);
	if (pathname === "/api/kite-drafts") return handleDrafts(request, env);
	if (pathname === "/api/kite-posts") return handlePosts(request, env);
	return json({ ok: false, error: "API route not found." }, { status: 404 });
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
