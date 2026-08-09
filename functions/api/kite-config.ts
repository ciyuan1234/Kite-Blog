const CONFIG_KEY = "kiteblog:config";

type KVNamespaceLike = {
	get: (key: string, type?: "json") => Promise<unknown>;
	put: (key: string, value: string) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

type PagesContext = {
	request: Request;
	env: Record<string, unknown> & {
		KITEBLOG_KV?: KVNamespaceLike;
		KITEBLOG_ADMIN_TOKEN?: string;
	};
};

const jsonHeaders = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	Allow: "GET, PUT, DELETE, OPTIONS",
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

function getToken(request: Request) {
	const auth = request.headers.get("authorization") || "";
	if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
	return request.headers.get("x-kiteblog-token") || "";
}

function isAuthorized(request: Request, env: Record<string, unknown>) {
	const expected = String(env.KITEBLOG_ADMIN_TOKEN || "");
	return !!expected && getToken(request) === expected;
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
	];
	const output: Record<string, string> = {};
	for (const key of allowList) {
		const value = input[key];
		if (typeof value !== "string") continue;
		output[key] = value.trim().slice(0, key.endsWith("Url") ? 2048 : 240);
	}
	return output;
}

function assertWriteReady(context: PagesContext) {
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
	const kv = context.env.KITEBLOG_KV;
	if (!kv) {
		return json({ ok: true, source: "default", config: null });
	}

	const config = await kv.get(CONFIG_KEY, "json");
	return json({ ok: true, source: config ? "kv" : "default", config });
}

export async function onRequestPut(context: PagesContext) {
	const failure = assertWriteReady(context);
	if (failure) return failure;

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;

	const body = await context.request.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
	}

	const config = normalizeConfig(body);
	await kv.put(CONFIG_KEY, JSON.stringify(config));
	return json({ ok: true, source: "kv", config });
}

export async function onRequestDelete(context: PagesContext) {
	const failure = assertWriteReady(context);
	if (failure) return failure;

	const kv = context.env.KITEBLOG_KV as KVNamespaceLike;
	await kv.delete(CONFIG_KEY);
	return json({ ok: true, source: "default", config: null });
}
