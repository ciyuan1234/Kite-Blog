# Repository Guidelines

## Project Overview

Firefly is an Astro 7 site with Svelte 5 islands and TypeScript, forked from Fuwari; this checkout (KiteBlog) adds a GitHub-backed admin backend with a Cloudflare Worker deployment. Primary language is Chinese (Simplified); i18n lives in `src/i18n` (`translation.ts`, `i18nKey.ts`, language files in `languages/*.ts`: en, zh_CN, zh_TW, ja, ko, ru). Node.js >= 22; use `pnpm` (`preinstall` enforces it). See `README.md` (deployment/ops) and `CLAUDE.md` (architecture) for background.

## Commands

- `pnpm dev` / `pnpm start`: run the Astro dev server.
- `pnpm check`: run Astro diagnostics.
- `pnpm type-check`: run `tsc --noEmit --isolatedDeclarations`. **`--isolatedDeclarations` means every exported function needs an explicit return type** or this fails.
- `pnpm lint` / `pnpm format`: Biome check and format over `./src ./functions ./worker.ts`.
- `pnpm build`: `scripts/generate-lqips.ts` → `astro build` → `scripts/subset-fonts.ts` → `pagefind --site dist` (LQIPs, icons, fonts, search index).
- `pnpm preview`: preview the production build in `dist`.
- `pnpm lqips`: regenerate `src/constants/lqips.json`.
- `pnpm new-post <filename>` / `pnpm new-dynamic` (alias `new-d`): scaffold a post / microblog entry.
- `pnpm deploy:cloudflare` (alias `deploy:worker`): `wrangler deploy` (production deployment; `deploy:pages` targets the legacy Pages path via `wrangler.pages.jsonc`).

On Windows PowerShell, use `pnpm.cmd`, or run local bins directly (`.node_modules\.bin\astro.cmd check`, `.node_modules\.bin\tsc.cmd --noEmit --isolatedDeclarations`) if pnpm version switching fails.

## Structure

- `src/pages/`: routes, including `admin/` (categories, friends, links, posts, settings) for the GitHub-backed backend UI and `api/` for static JSON endpoints. The admin REST API lives in the Worker, not in `src/pages/api/`.
- `src/content/`: collections `posts` (`.md`/`.mdx`), `spec` (about/tech pages, empty schema), and `dynamic` (microblog, `.md` only), defined in `src/content.config.ts`.
- `src/config/*Config.ts` with mirrored types in `src/types/`; import via the `@/config` barrel.
- `src/plugins/`: remark/rehype plugins (Mermaid, PlantUML, KaTeX, callouts, wiki links…), wired in `astro.config.mjs`.
- `src/components`, `src/layouts`, `src/styles`, `src/utils`, `src/assets`, `src/constants`.
- `worker.ts`: the entire Cloudflare Worker — GitHub OAuth, admin API (`handleApi`), and writing content/config back to GitHub via the Contents API.
- `scripts/`: build-time utilities.
- Path aliases: `@/*` → `src/*`, plus `@components/*`, `@utils/*`, `@constants/*`, `@i18n/*`, `@layouts/*`.
- Interactive UI uses Svelte islands (mounted with `client:load`/`client:visible`) and Swup for SPA-like page transitions.

## The Worker vs. Legacy Functions

- `worker.ts` is the single deployed API entrypoint (`wrangler.jsonc` → `main: ./worker.ts`). Its `fetch` routes `/api/*` to `handleApi` (OAuth, posts, settings, categories, links, friends, assets upload); everything else falls through to `env.ASSETS.fetch`.
- **`functions/api/kite-*.ts` are dead legacy code** (old KV-`kiteblog:`-backed Pages Functions). `worker.ts` never imports them and they are not deployed; do not edit them expecting changes to take effect. Biome still lints `./functions`, so leave them in place.
- `vercel.json` is stale from the Fuwari fork; production is Cloudflare Worker, not Vercel.

## Build-time Gotchas

- `astro.config.mjs` reads `src/config` values at build time: config changes require a rebuild/redeploy, not just a dev-server restart.
- Env vars read at build/dev: `PUBLIC_SITE_URL`, `PUBLIC_BASE_PATH`, `CF_WORKERS` (enables the Cloudflare adapter), and `PUBLIC_DISPLAY_SETTINGS` (forces the display-settings panel on, overriding `displaySettingsConfig.enable`).
- Generated files are committed: `src/constants/lqips.json` (regenerate with `pnpm lqips`) and `src/constants/icons-data.json` (no generator script; Biome-ignored). Review them before committing. `trailingSlash: "always"` is set; the Worker forces trailing slashes too.

## Admin & Persistence

- The admin saves content and settings back to GitHub (`ciyuan1234/Kite-Blog`, branch `main`) through `worker.ts`; the repo is the single source of truth. Front-end changes appear only after Cloudflare redeploys.
- Admin credentials (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REPO_TOKEN`, `SESSION_SECRET`, `ADMIN_GITHUB_LOGIN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_REPO_BRANCH`) are Cloudflare env vars/secrets — never hardcode or commit them.
- `main` is the deployment branch; don't push production changes only to another branch.
- **CI mismatch:** GitHub Actions (`build.yml`, `biome.yml`) trigger on `master`, but production deploys and admin writes use `main`. Pushing to `main` will not run CI.

## Conventions

- Biome: tabs, double quotes; `.svelte`/`.astro` rules relaxed (unused vars/imports, `useConst`, `useImportType` off). Avoid unrelated formatting churn. `.gitattributes` forces LF (`eol=lf`) — don't introduce CRLF even on Windows.
- Components in PascalCase, config modules `camelCase` + `Config.ts`, utilities kebab-case.
- Conventional Commits (`feat:`, `fix:`, `chore:`; history also uses `post:`/`config:` for admin-generated commits). Keep commits/PRs focused; discuss major features in an issue or discussion first.
- No unit-test framework. Verify rendering/content/generated-asset work with `pnpm check`, `pnpm type-check`, and `pnpm build`; verify visual/interactive changes with `pnpm dev` or `pnpm preview` and include screenshots in the PR.