const jsonHeaders = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	Allow: "GET, POST, DELETE, OPTIONS",
};

type KVNamespaceLike = {
	get: (key: string) => Promise<string | null>;
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
			.slice(0, 80) || "draft"
	);
}

function isDraftKey(value: string) {
	return value.startsWith("kiteblog:draft:") && value.length <= 160;
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

function assertReady(context: PagesContext) {
	if (!context.env.KITEBLOG_KV) {
		return json(
			{
				ok: false,
				error: "Cloudflare KV binding KITEBLOG_KV is not configured.",
			},
			{ status: 501 },
		);
	}
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

export async function onRequestOptions() {
	return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function onRequestGet(context: PagesContext) {
	const failure = assertReady(context);
	if (failure) return failure;

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	const url = new URL(context.request.url);
	const key = url.searchParams.get("key") || "";
	if (key) {
		if (!isDraftKey(key)) {
			return json({ ok: false, error: "Invalid draft key." }, { status: 400 });
		}

		const markdown = await kv.get(key);
		if (markdown === null) {
			return json({ ok: false, error: "Draft not found." }, { status: 404 });
		}

		return json({ ok: true, key, markdown });
	}

	const list = await kv.list({ prefix: "kiteblog:draft:", limit: 50 });
	return json({
		ok: true,
		drafts: list.keys.map((item) => ({
			key: item.name,
			metadata: item.metadata || null,
		})),
	});
}

export async function onRequestPost(context: PagesContext) {
	const failure = assertReady(context);
	if (failure) return failure;
	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;

	const body = await context.request.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
	}

	const title = String(body.title || "未命名草稿")
		.trim()
		.slice(0, 160);
	const slug = slugify(String(body.slug || title));
	const markdown = String(body.markdown || "").slice(0, 200000);
	if (!markdown) {
		return json(
			{ ok: false, error: "Draft markdown is empty." },
			{ status: 400 },
		);
	}

	const now = new Date().toISOString();
	const key = `kiteblog:draft:${now.slice(0, 10)}:${slug}`;
	await kv.put(key, markdown, {
		metadata: {
			title,
			slug,
			updatedAt: now,
		},
	});

	return json({ ok: true, key, updatedAt: now });
}

export async function onRequestDelete(context: PagesContext) {
	const failure = assertReady(context);
	if (failure) return failure;

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	const url = new URL(context.request.url);
	const key = url.searchParams.get("key") || "";
	if (!isDraftKey(key)) {
		return json({ ok: false, error: "Invalid draft key." }, { status: 400 });
	}

	await kv.delete(key);
	return json({ ok: true, key });
}
