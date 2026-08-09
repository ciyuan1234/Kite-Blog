const POST_PREFIX = "kiteblog:post:";

const jsonHeaders = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	Allow: "GET, POST, PUT, DELETE, OPTIONS",
};

type PostMetadata = {
	title: string;
	slug: string;
	description: string;
	category: string;
	tags: string;
	publishedAt: string;
	updatedAt: string;
	cover: string;
};

type PostRecord = PostMetadata & {
	markdown: string;
};

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

type PagesContext = {
	request: Request;
	env: Record<string, unknown> & {
		KITEBLOG_KV?: KVNamespaceLike;
		KITEBLOG_ADMIN_TOKEN?: string;
	};
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

function slugify(value: string) {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 96) || "post"
	);
}

function postKey(slug: string) {
	return `${POST_PREFIX}${slugify(slug)}`;
}

function getToken(request: Request) {
	const auth = request.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
	return request.headers.get("x-kiteblog-token") || "";
}

function isAuthorized(request: Request, env: Record<string, unknown>) {
	const expected = String(env.KITEBLOG_ADMIN_TOKEN || "");
	return !!expected && getToken(request) === expected;
}

function assertKv(context: PagesContext) {
	if (!context.env.KITEBLOG_KV) {
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

function assertWriteReady(context: PagesContext) {
	const kvFailure = assertKv(context);
	if (kvFailure) return kvFailure;

	if (!context.env.KITEBLOG_ADMIN_TOKEN) {
		return json(
			{ ok: false, error: "KITEBLOG_ADMIN_TOKEN is not configured." },
			{ status: 501 },
		);
	}

	if (!isAuthorized(context.request, context.env)) {
		return json({ ok: false, error: "Unauthorized." }, { status: 401 });
	}

	return null;
}

function cleanText(value: unknown, fallback = "", maxLength = 240) {
	return String(value || fallback)
		.trim()
		.slice(0, maxLength);
}

function normalizePost(input: Record<string, unknown>): PostRecord {
	const now = new Date().toISOString();
	const title = cleanText(input.title, "未命名文章", 160);
	const slug = slugify(cleanText(input.slug, title, 96));
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

export async function onRequestOptions() {
	return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet(context: PagesContext) {
	const failure = assertKv(context);
	if (failure) return failure;

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	const url = new URL(context.request.url);
	const slug = url.searchParams.get("slug") || "";

	if (slug) {
		const post = await kv.get(postKey(slug), "json");
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
			String((b as PostMetadata).publishedAt || "").localeCompare(
				String((a as PostMetadata).publishedAt || ""),
			),
		);

	return json({ ok: true, posts });
}

export async function onRequestPost(context: PagesContext) {
	const failure = assertWriteReady(context);
	if (failure) return failure;

	const body = await context.request.json().catch(() => null);
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

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	await kv.put(postKey(post.slug), JSON.stringify(post), {
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

export const onRequestPut = onRequestPost;

export async function onRequestDelete(context: PagesContext) {
	const failure = assertWriteReady(context);
	if (failure) return failure;

	const url = new URL(context.request.url);
	const slug = url.searchParams.get("slug") || "";
	if (!slug) {
		return json({ ok: false, error: "Missing post slug." }, { status: 400 });
	}

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	await kv.delete(postKey(slug));
	return json({ ok: true, slug: slugify(slug) });
}
