import DOMPurify from "dompurify";
import katex from "katex";
import { marked } from "marked";
import { deflateRaw } from "pako";
import "katex/dist/katex.min.css";

import mermanWasmUrl from "@mermanjs/web/pkg/full/merman_wasm_bg.wasm?url";

type MermanModule = {
	initMerman: (options: {
		wasm: { module_or_path: Uint8Array };
	}) => Promise<void>;
	renderSvg: (code: string, options: unknown) => string;
	assertSafeSvgForDom: (svg: string) => void;
};

export type KiteEditorMode = "split" | "preview";

export type KiteEditorOptions = {
	textarea: HTMLTextAreaElement;
	split: HTMLElement;
	preview: HTMLElement;
	slug: () => string;
};

type MarkdownBlock = {
	source: string;
	startLine: number;
};

const SANITIZE_CONFIG = {
	USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
	ADD_TAGS: ["iframe", "mjx-container"],
	ADD_ATTR: [
		"allow",
		"allowfullscreen",
		"frameborder",
		"scrolling",
		"loading",
		"referrerpolicy",
		"width",
		"height",
	],
	FORBID_TAGS: ["script", "style", "link", "meta", "base"],
};

marked.setOptions({ gfm: true, breaks: false });

let currentSlug = "draft";

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
	if (node.tagName === "IMG") {
		node.setAttribute("src", resolveAssetUrl(node.getAttribute("src") || ""));
	}
});

function resolveAssetUrl(src: string): string {
	const raw = String(src || "").trim();
	if (/^(https?:|data:|#|\/)/i.test(raw)) return raw;
	if (raw.startsWith("./")) {
		return `/posts/${encodeURIComponent(currentSlug)}/${raw.slice(2)}`;
	}
	return `/posts/${encodeURIComponent(currentSlug)}/${raw}`;
}

function splitBlocks(markdown: string): MarkdownBlock[] {
	const lines = String(markdown || "").split("\n");
	const blocks: MarkdownBlock[] = [];
	let i = 0;
	while (i < lines.length) {
		while (i < lines.length && lines[i].trim() === "") i += 1;
		if (i >= lines.length) break;
		const startLine = i + 1;
		const line = lines[i];
		const fence = /^\s*(```+|~~~+)/.exec(line);
		if (fence) {
			const marker = fence[1][0];
			let j = i + 1;
			while (
				j < lines.length &&
				!new RegExp(`^\\s*${marker}{3,}`).test(lines[j])
			) {
				j += 1;
			}
			if (j < lines.length) j += 1;
			blocks.push({ source: lines.slice(i, j).join("\n"), startLine });
			i = j;
			continue;
		}
		if (/^\s*\|/.test(line)) {
			let j = i + 1;
			while (j < lines.length && /^\s*\|/.test(lines[j])) j += 1;
			blocks.push({ source: lines.slice(i, j).join("\n"), startLine });
			i = j;
			continue;
		}
		if (/^\s*>/.test(line)) {
			let j = i + 1;
			let sawBlank = false;
			while (j < lines.length) {
				if (/^\s*>/.test(lines[j])) {
					sawBlank = false;
					j += 1;
				} else if (/^\s*$/.test(lines[j]) && !sawBlank) {
					sawBlank = true;
					j += 1;
				} else {
					break;
				}
			}
			blocks.push({ source: lines.slice(i, j).join("\n"), startLine });
			i = j;
			continue;
		}
		let j = i + 1;
		while (j < lines.length && lines[j].trim() !== "") j += 1;
		blocks.push({ source: lines.slice(i, j).join("\n"), startLine });
		i = j;
	}
	return blocks;
}

type StashKind = "fence" | "code" | "math";

type StashEntry = {
	kind: StashKind;
	value: string;
	display?: boolean;
	prefix?: string;
};

type CalloutEntry = {
	token: string;
	type: string;
	titleHtml: string;
	body: string;
};

const STASH_OPEN = "\uE000k";
const STASH_CLOSE = "\uE001";
const CALL_OUT = "\uE000c";
const STASH_PATTERN = new RegExp(`${STASH_OPEN}(\\d+)${STASH_CLOSE}`, "g");
const CALL_OUT_PATTERN = new RegExp(`${CALL_OUT}(\\d+)${STASH_CLOSE}`, "g");

function stashTokens(source: string): { text: string; stash: StashEntry[] } {
	const stash: StashEntry[] = [];
	let text = source.replace(
		/(```+|~~~+)(\S[^\n]*)?\n([\s\S]*?)\n\1/g,
		(match) => {
			stash.push({ kind: "fence", value: match });
			return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`;
		},
	);
	text = text.replace(/`([^`\n]+)`/g, (match) => {
		stash.push({ kind: "code", value: match });
		return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`;
	});
	text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr: string) => {
		stash.push({ kind: "math", value: expr.trim(), display: true });
		return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`;
	});
	text = text.replace(
		/(^|[^$\w\\])\$([^$\n]+?)\$(?!\$)/g,
		(_match, prefix: string, expr: string) => {
			stash.push({ kind: "math", value: expr.trim(), display: false, prefix });
			return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`;
		},
	);
	return { text, stash };
}

function restoreStash(text: string, stash: StashEntry[]): string {
	return text.replace(STASH_PATTERN, (match, index: string) => {
		const entry = stash[Number(index)];
		if (!entry || entry.kind === "math") return match;
		return entry.value;
	});
}

function renderMathTokens(text: string, stash: StashEntry[]): string {
	return text.replace(STASH_PATTERN, (match, index: string) => {
		const entry = stash[Number(index)];
		if (entry?.kind !== "math") return match;
		try {
			const html = katex.renderToString(entry.value, {
				displayMode: entry.display === true,
				throwOnError: false,
				errorColor: "#e5484d",
			});
			return `${entry.prefix ?? ""}${html}`;
		} catch {
			return entry.value;
		}
	});
}

function escapeAttr(value: string): string {
	return String(value).replace(
		/[&<>"']/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				char
			] ?? char,
	);
}

const CALLOUT_OPEN = /^\s*>\s*\[!(\w+)\](?:\s+([^\n]*))?$/i;

function routeCallouts(
	source: string,
	callouts: CalloutEntry[],
	depth: number,
	stash: StashEntry[],
): string {
	const lines = source.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const match = CALLOUT_OPEN.exec(lines[i]);
		if (!match) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const type = match[1].toLowerCase();
		if (!/^[a-z]{1,20}$/.test(type)) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const bodyLines: string[] = [];
		let j = i + 1;
		let sawBlank = false;
		while (j < lines.length) {
			if (/^\s*>/.test(lines[j])) {
				if (CALLOUT_OPEN.test(lines[j])) break;
				sawBlank = false;
				bodyLines.push(lines[j].replace(/^\s*>\s?/, ""));
				j += 1;
			} else if (/^\s*$/.test(lines[j]) && !sawBlank) {
				sawBlank = true;
				bodyLines.push("");
				j += 1;
			} else {
				break;
			}
		}
		const fallback = match[1].charAt(0).toUpperCase() + match[1].slice(1);
		const rawTitle = (match[2] || "").trim() || fallback;
		const titleHtml =
			depth > 4
				? escapeAttr(rawTitle)
				: renderMarkdownToSafeHtml(rawTitle, depth + 1, stash);
		const token = `${CALL_OUT}${callouts.length}${STASH_CLOSE}`;
		callouts.push({
			token,
			type,
			titleHtml,
			body: bodyLines.join("\n"),
		});
		out.push(token);
		i = j;
	}
	return out.join("\n");
}

function routeWikiLinks(source: string): string {
	return source.replace(
		/(^|[^![])\[\[([^[\]\n]+)\]\]/g,
		(match, prefix: string, raw: string) => {
			const sep = raw.indexOf("|");
			const dest = (sep === -1 ? raw : raw.slice(0, sep)).trim();
			const alias = sep === -1 ? "" : raw.slice(sep + 1).trim();
			if (!dest) return match;
			const clean = dest
				.replace(/\.mdx?$/i, "")
				.replace(/^\.\//, "")
				.replace(/^\/?/, "")
				.replace(/\/+$/, "");
			if (!clean) return match;
			const prefixPath = clean.startsWith("posts/")
				? clean.slice("posts/".length)
				: clean;
			const url = `/posts/${encodeURIComponent(prefixPath)}/`;
			const text = alias || prefixPath.split("/").pop() || prefixPath;
			return `${prefix}[${text}](${url})`;
		},
	);
}

function renderMarkdownToSafeHtml(
	source: string,
	depth = 0,
	outerStash: StashEntry[] = [],
): string {
	const staged = stashTokens(source);
	let text = staged.text.replace(STASH_PATTERN, (match, index: string) => {
		const entryIndex = Number(index);
		if (entryIndex >= staged.stash.length) return match;
		return `${STASH_OPEN}${entryIndex + outerStash.length}${STASH_CLOSE}`;
	});
	const stash = [...outerStash, ...staged.stash];
	const callouts: CalloutEntry[] = [];
	text = routeWikiLinks(text);
	text = routeCallouts(text, callouts, depth, stash);
	text = restoreStash(text, stash);
	const html = marked.parse(text) as string;
	let safe = DOMPurify.sanitize(html, SANITIZE_CONFIG);
	safe = renderMathTokens(safe, stash);
	for (const callout of callouts) {
		const bodyHtml =
			callout.body.trim() === ""
				? ""
				: renderMarkdownToSafeHtml(callout.body, depth + 1, stash);
		safe = safe.replace(
			callout.token,
			`<div class="callout" data-callout="${escapeAttr(callout.type)}">` +
				`<div class="callout-title">${callout.titleHtml}</div>` +
				`<div class="callout-content">${bodyHtml}</div></div>`,
		);
	}
	return safe.replace(CALL_OUT_PATTERN, "");
}

function renderBlock(source: string): string {
	return renderMarkdownToSafeHtml(source);
}

const PLANTUML_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function encode6bit(value: number): string {
	return PLANTUML_ALPHABET.charAt(value & 0x3f);
}

function append3bytes(b1: number, b2: number, b3: number): string {
	const c1 = b1 >> 2;
	const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
	const c4 = b3 & 0x3f;
	return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode64(bytes: Uint8Array): string {
	let result = "";
	const length = bytes.length;
	for (let i = 0; i < length; i += 3) {
		if (i + 2 === length) result += append3bytes(bytes[i], bytes[i + 1], 0);
		else if (i + 1 === length) result += append3bytes(bytes[i], 0, 0);
		else result += append3bytes(bytes[i], bytes[i + 1], bytes[i + 2]);
	}
	return result;
}

function encodePlantUML(source: string): string {
	const utf8Bytes = new TextEncoder().encode(source);
	const deflated = deflateRaw(utf8Bytes, { level: 9 });
	return encode64(deflated);
}

function mermaidTheme(): "editor-light" | "editor-dark" {
	return document.documentElement.classList.contains("dark")
		? "editor-dark"
		: "editor-light";
}

const mermaidCache = new Map<string, Promise<string>>();
let mermanReady: Promise<MermanModule> | null = null;

function ensureMerman(): Promise<MermanModule> {
	if (!mermanReady) {
		mermanReady = import("@mermanjs/web").then(async (mod) => {
			const bytes = await fetch(mermanWasmUrl).then((response) =>
				response.arrayBuffer(),
			);
			await mod.initMerman({
				wasm: { module_or_path: new Uint8Array(bytes) },
			});
			return mod as unknown as MermanModule;
		});
	}
	return mermanReady;
}

function upgradeDiagrams(root: HTMLElement): void {
	root
		.querySelectorAll(
			"pre > code.language-mermaid, pre > code.language-mermaidjs",
		)
		.forEach((code) => {
			const pre = code.parentElement;
			const source = code.textContent ?? "";
			if (!pre || !source.trim()) return;
			const key = `${mermaidTheme()}\u0000${source}`;
			let job = mermaidCache.get(key);
			if (!job) {
				job = ensureMerman().then((mod) =>
					mod.renderSvg(source, {
						host_theme: { preset: mermaidTheme() },
						svg: { pipeline: "parity" },
					}),
				);
				mermaidCache.set(key, job);
			}
			job
				.then(async (svg) => {
					const mod = await ensureMerman();
					mod.assertSafeSvgForDom(svg);
					const wrap = document.createElement("div");
					wrap.className = "kb-mermaid";
					wrap.innerHTML = svg;
					pre.replaceWith(wrap);
				})
				.catch(() => undefined);
		});
	root.querySelectorAll("pre > code.language-plantuml").forEach((code) => {
		const pre = code.parentElement;
		const source = code.textContent ?? "";
		if (!pre || !source.trim()) return;
		const img = document.createElement("img");
		img.className = "kb-plantuml";
		img.alt = "plantuml 图";
		img.loading = "lazy";
		img.src = `https://www.plantuml.com/plantuml/svg/${encodePlantUML(source)}`;
		pre.replaceWith(img);
	});
}

function lineNumberAt(text: string, offset: number): number {
	if (offset <= 0) return 1;
	return text.slice(0, Math.min(offset, text.length)).split("\n").length;
}

function caretAtLineStart(text: string, line: number): number {
	const lines = text.split("\n");
	let pos = 0;
	const target = Math.max(1, Math.min(line, lines.length + 1));
	for (let k = 0; k < target - 1; k += 1) pos += lines[k].length + 1;
	return Math.min(pos, text.length);
}

export type KiteEditorInstance = {
	setMode(next: KiteEditorMode): void;
	sync(): void;
};

export function mountEditor(options: KiteEditorOptions): KiteEditorInstance {
	const { textarea, split, preview, slug } = options;
	let mode: KiteEditorMode = "split";
	let blocks: MarkdownBlock[] = [];
	let renderTimer = 0;

	currentSlug = slug() || "draft";

	function renderSplit(): void {
		currentSlug = slug() || "draft";
		blocks = splitBlocks(textarea.value);
		preview.innerHTML = blocks
			.map(
				(block, index) =>
					`<section class="kb-block" data-index="${index}" data-src-line="${block.startLine}" role="button" tabindex="0">${renderBlock(block.source)}</section>`,
			)
			.join("");
		void upgradeDiagrams(preview);
	}

	function splitHighlight(): void {
		const line = lineNumberAt(textarea.value, textarea.selectionStart ?? 0);
		let target: Element | null = null;
		for (const section of Array.from(
			preview.querySelectorAll<HTMLElement>(".kb-block"),
		)) {
			const start = Number(section.getAttribute("data-src-line") || 0);
			if (start <= line) target = section;
		}
		if (target) {
			preview.querySelectorAll(".kb-block").forEach((el) => {
				el.classList.remove("kb-active");
			});
			target.classList.add("kb-active");
		}
	}

	function previewScrollSync(): void {
		const maxSrc = textarea.scrollHeight - textarea.clientHeight;
		const maxDst = preview.scrollHeight - preview.clientHeight;
		if (maxSrc <= 0 || maxDst <= 0) return;
		preview.scrollTop = (textarea.scrollTop / maxSrc) * maxDst;
	}

	function renderPreviewMode(): void {
		currentSlug = slug() || "draft";
		preview.innerHTML = renderBlock(textarea.value);
		void upgradeDiagrams(preview);
	}

	function renderAll(): void {
		if (mode === "split") renderSplit();
		else renderPreviewMode();
	}

	function layout(): void {
		split.classList.toggle("kb-preview-only", mode === "preview");
		if (mode === "split") {
			split.hidden = false;
			preview.hidden = false;
			textarea.hidden = false;
			textarea.classList.add("kb-textarea");
			renderSplit();
			splitHighlight();
		} else {
			split.hidden = false;
			preview.hidden = false;
			textarea.hidden = true;
			renderPreviewMode();
		}
	}

	textarea.addEventListener("input", () => {
		window.clearTimeout(renderTimer);
		renderTimer = window.setTimeout(() => {
			if (mode === "split") {
				renderSplit();
				splitHighlight();
			}
		}, 200);
	});
	textarea.addEventListener("scroll", previewScrollSync, { passive: true });
	textarea.addEventListener("keyup", splitHighlight);
	textarea.addEventListener("click", splitHighlight);

	preview.addEventListener("click", (event) => {
		const section =
			event.target instanceof HTMLElement
				? event.target.closest<HTMLElement>(".kb-block")
				: null;
		if (!section) return;
		const line = Number(section.getAttribute("data-src-line") || 1);
		textarea.focus();
		const offset = caretAtLineStart(textarea.value, line);
		textarea.setSelectionRange(offset, offset);
		const maxScroll = textarea.scrollHeight - textarea.clientHeight;
		if (maxScroll > 0) {
			const lines = textarea.value.split("\n").length;
			textarea.scrollTop = ((line - 1) / Math.max(lines - 1, 1)) * maxScroll;
		}
		splitHighlight();
	});
	preview.addEventListener("click", splitHighlight);

	layout();

	return {
		setMode(next) {
			mode = next;
			layout();
		},
		sync() {
			renderAll();
		},
	};
}
